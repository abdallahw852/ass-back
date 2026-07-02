import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ConfigService } from '@nestjs/config';
import { RegisterUserCommand } from './register-user.command';
import { USER_REPOSITORY } from '../../domain/repositories/user.repository.interface';
import type { IUserRepository } from '../../domain/repositories/user.repository.interface';
import { OTP_CODE_REPOSITORY } from '../../domain/repositories/otp-code.repository.interface';
import type { IOtpCodeRepository } from '../../domain/repositories/otp-code.repository.interface';
import { PASSWORD_PORT } from '../ports/password.port';
import type { IPasswordPort } from '../ports/password.port';
import { OtpService } from '../../../../shared/infrastructure/services/otp.service';
import { EmailService } from '../../../../shared/infrastructure/services/email.service';
import { validatePassword } from '../../domain/value-objects/password-policy';
import { UserRole } from '../../domain/enums/user-role.enum';
import {
  AuthAccountTypeMismatchException,
  AuthEmailAlreadyRegisteredException,
  AuthPasswordPolicyViolationException,
  AuthPhoneAlreadyInUseException,
} from '../../domain/auth.exceptions';
import { randomUUID } from 'crypto';

export type RegisterUserResult = { status: 'otp_sent' };

const PURPOSE = 'signup_verification';

@CommandHandler(RegisterUserCommand)
export class RegisterUserHandler implements ICommandHandler<
  RegisterUserCommand,
  RegisterUserResult
> {
  private readonly logger = new Logger(RegisterUserHandler.name);

  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepo: IUserRepository,
    @Inject(OTP_CODE_REPOSITORY)
    private readonly otpRepo: IOtpCodeRepository,
    @Inject(PASSWORD_PORT)
    private readonly passwordPort: IPasswordPort,
    private readonly emailService: EmailService,
    private readonly otpService: OtpService,
    private readonly configService: ConfigService,
  ) {}

  async execute(command: RegisterUserCommand): Promise<RegisterUserResult> {
    const email = command.email.trim().toLowerCase();
    const name = command.name.trim();
    const phone = command.phone.trim();
    const avatarUrl = command.avatarUrl;
    const role =
      command.accountType === 'supplier' ? UserRole.SUPPLIER : UserRole.BUYER;

    this.logger.debug(
      `[register] attempt email=${email} accountType=${command.accountType}`,
    );

    const validation = validatePassword(command.password);
    if (!validation.valid) {
      this.logger.debug(
        `[register] password policy violation email=${email} violations=${JSON.stringify(validation.violations)}`,
      );
      throw new AuthPasswordPolicyViolationException(validation.violations);
    }

    const existing = await this.userRepo.findByEmailIncludingUnverified(email);
    this.logger.debug(
      `[register] existing user lookup email=${email} found=${!!existing} verifiedAt=${existing?.verifiedAt ? existing.verifiedAt.toISOString() : 'null'}`,
    );

    if (phone) {
      const phoneOwner = await this.userRepo.findByPhone(phone);
      if (phoneOwner && phoneOwner.email !== email) {
        throw new AuthPhoneAlreadyInUseException();
      }
    }

    if (existing?.onboardingCompletedAt) {
      this.logger.debug(
        `[register] onboarding already complete — rejecting email=${email}`,
      );
      await this.passwordPort.dummyHash(command.password);
      throw new AuthEmailAlreadyRegisteredException();
    }

    if (existing && !existing.onboardingCompletedAt) {
      if (existing.role !== role) {
        this.logger.debug(
          `[register] account type mismatch email=${email} existingRole=${existing.role} requestedRole=${role}`,
        );
        throw new AuthAccountTypeMismatchException();
      }
      this.logger.debug(
        `[register] re-registering incomplete user email=${email} — updating credentials and resetting verification`,
      );
      const passwordHash = await this.passwordPort.hash(command.password);
      // Re-registration of an incomplete account: refresh credentials and
      // reset verification so the new OTP step is meaningful. Any in-progress
      // supplier data is intentionally left untouched.
      await this.userRepo.save({
        ...existing,
        passwordHash,
        name,
        phone,
        verifiedAt: null,
        ...(avatarUrl !== null && { avatar: avatarUrl }),
      });
      await this.otpRepo.invalidateActiveByEmailAndPurpose(email, PURPOSE);
    } else {
      this.logger.debug(
        `[register] creating new user email=${email} role=${role}`,
      );
      const passwordHash = await this.passwordPort.hash(command.password);
      await this.userRepo.save({
        _id: randomUUID(),
        email,
        role,
        passwordHash,
        verifiedAt: null,
        requiresPasswordSetup: false,
        name,
        phone,
        ...(avatarUrl !== null && { avatar: avatarUrl }),
      });
    }

    const ttl = Number(
      this.configService.get<number>('OTP_TTL_SECONDS') ?? 600,
    );
    const length = Number(this.configService.get<number>('OTP_LENGTH') ?? 6);
    const code = this.otpService.generate(length);
    const codeHash = await this.otpService.hash(code);
    const expiresAt = new Date(Date.now() + ttl * 1000);

    this.logger.debug(
      `[register] saving OTP record email=${email} ttl=${ttl}s expiresAt=${expiresAt.toISOString()}`,
    );
    await this.otpRepo.createRecord({
      email,
      codeHash,
      expiresAt,
      purpose: PURPOSE,
    });

    this.logger.debug(`[register] sending OTP email to ${email}`);
    try {
      await this.emailService.sendOtpEmail(email, code, ttl);
      this.logger.debug(`[register] OTP email sent successfully to ${email}`);
    } catch (err) {
      this.logger.error(
        `[register] failed to send OTP email to ${email}`,
        err instanceof Error ? err.stack : err,
      );
      throw err;
    }

    return { status: 'otp_sent' };
  }
}
