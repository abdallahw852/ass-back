import { Inject, UnauthorizedException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ConfigService } from '@nestjs/config';
import { RequestOtpCommand } from '../request-otp.command';
import type { IOtpCodeRepository } from '../../../domain/repositories/otp-code.repository.interface';
import { OTP_CODE_REPOSITORY } from '../../../domain/repositories/otp-code.repository.interface';
import type { IUserRepository } from '../../../domain/repositories/user.repository.interface';
import { USER_REPOSITORY } from '../../../domain/repositories/user.repository.interface';
import { PASSWORD_PORT } from '../../ports/password.port';
import type { IPasswordPort } from '../../ports/password.port';
import { UserRole } from '../../../domain/enums/user-role.enum';
import { OtpService } from '../../../../../shared/infrastructure/services/otp.service';
import { EmailService } from '../../../../../shared/infrastructure/services/email.service';
import { AuthOtpResendCooldownException } from '../../../domain/auth.exceptions';

export type RequestOtpResult = { isNewUser: boolean };

const PURPOSE = 'signup_verification';

@CommandHandler(RequestOtpCommand)
export class RequestOtpHandler implements ICommandHandler<
  RequestOtpCommand,
  RequestOtpResult
> {
  constructor(
    @Inject(OTP_CODE_REPOSITORY)
    private readonly otpCodeRepository: IOtpCodeRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    private readonly otpService: OtpService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
    @Inject(PASSWORD_PORT)
    private readonly passwordPort: IPasswordPort,
  ) {}

  async execute(command: RequestOtpCommand): Promise<RequestOtpResult> {
    const email = command.email.trim().toLowerCase();

    const existingUser =
      await this.userRepository.findByEmailIncludingUnverified(email);

    if (
      command.accountType === UserRole.ADMIN &&
      (!existingUser || existingUser.role !== UserRole.ADMIN)
    ) {
      throw new UnauthorizedException('Admin account not found.');
    }

    const isAdminRequest = command.accountType === UserRole.ADMIN;
    if (!isAdminRequest && (!existingUser || existingUser.verifiedAt)) {
      await this.passwordPort.dummyHash(command.email);
      return { isNewUser: !existingUser };
    }

    const resendWindowSeconds = Number(
      this.configService.get<number>('OTP_RESEND_WINDOW_SECONDS') ?? 60,
    );
    const latest = await this.otpCodeRepository.findLatestByEmailAndPurpose(
      email,
      PURPOSE,
    );
    if (
      latest &&
      !latest.consumedAt &&
      Date.now() - new Date(latest.createdAt).getTime() <
        resendWindowSeconds * 1000
    ) {
      throw new AuthOtpResendCooldownException();
    }

    const otpLength = Number(this.configService.get<number>('OTP_LENGTH') ?? 6);
    const ttlSeconds = Number(
      this.configService.get<number>('OTP_TTL_SECONDS') ?? 300,
    );
    const code = this.otpService.generate(otpLength);
    const codeHash = await this.otpService.hash(code);

    await this.otpCodeRepository.invalidateActiveByEmailAndPurpose(
      email,
      PURPOSE,
    );
    await this.otpCodeRepository.createRecord({
      email,
      codeHash,
      expiresAt: new Date(Date.now() + ttlSeconds * 1000),
      purpose: PURPOSE,
      userId: existingUser?.id ?? null,
    });
    await this.emailService.sendOtpEmail(email, code, ttlSeconds);

    return { isNewUser: false };
  }
}
