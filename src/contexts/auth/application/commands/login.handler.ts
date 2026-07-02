import { Inject } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { ConfigService } from '@nestjs/config';
import { LoginCommand } from './login.command';
import { USER_REPOSITORY } from '../../domain/repositories/user.repository.interface';
import type { IUserRepository } from '../../domain/repositories/user.repository.interface';
import { OTP_CODE_REPOSITORY } from '../../domain/repositories/otp-code.repository.interface';
import type { IOtpCodeRepository } from '../../domain/repositories/otp-code.repository.interface';
import { PASSWORD_PORT } from '../ports/password.port';
import type { IPasswordPort } from '../ports/password.port';
import { OtpService } from '../../../../shared/infrastructure/services/otp.service';
import { EmailService } from '../../../../shared/infrastructure/services/email.service';
import {
  AuthInvalidCredentialsException,
  AuthPasswordSetupRequiredException,
  AuthUserNotVerifiedException,
  AuthUserSuspendedException,
} from '../../domain/auth.exceptions';
import { LoginSucceededEvent } from '../../domain/events/login-succeeded.event';
import { LoginFailedEvent } from '../../domain/events/login-failed.event';

type SessionLike = {
  user?: {
    id: number;
    _id: string;
    email: string;
    role: string;
    verifiedAt: Date | null;
  };
  save?: () => Promise<void>;
};

export type LoginResult = { status: 'ok' };

const OTP_PURPOSE = 'signup_verification';

@CommandHandler(LoginCommand)
export class LoginHandler implements ICommandHandler<
  LoginCommand,
  LoginResult
> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepo: IUserRepository,
    @Inject(OTP_CODE_REPOSITORY)
    private readonly otpRepo: IOtpCodeRepository,
    @Inject(PASSWORD_PORT)
    private readonly passwordPort: IPasswordPort,
    private readonly otpService: OtpService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: LoginCommand): Promise<LoginResult> {
    const email = command.email.trim().toLowerCase();
    const { ip, userAgent } = command;

    const user = await this.userRepo.findByEmailIncludingUnverified(email);
    if (!user || !user.passwordHash) {
      await this.passwordPort.dummyHash(command.password);
      this.eventBus.publish(
        LoginFailedEvent.create({
          aggregateId: 'anonymous',
          version: 0,
          userId: null,
          email,
          ip,
          userAgent,
          reason: 'invalid_credentials',
        }),
      );
      throw new AuthInvalidCredentialsException();
    }

    const isMatch = await this.passwordPort.compare(
      command.password,
      user.passwordHash,
    );
    if (!isMatch) {
      this.eventBus.publish(
        LoginFailedEvent.create({
          aggregateId: user._id,
          version: 0,
          userId: user.id,
          email,
          ip,
          userAgent,
          reason: 'invalid_credentials',
        }),
      );
      throw new AuthInvalidCredentialsException();
    }

    if (user.status === 'suspended') {
      throw new AuthUserSuspendedException();
    }

    if (!user.verifiedAt) {
      await this._issueOtp(email, user.id);
      this.eventBus.publish(
        LoginFailedEvent.create({
          aggregateId: user._id,
          version: 0,
          userId: user.id,
          email,
          ip,
          userAgent,
          reason: 'unverified',
        }),
      );
      throw new AuthUserNotVerifiedException();
    }

    if (user.requiresPasswordSetup) {
      throw new AuthPasswordSetupRequiredException();
    }

    const session = command.session as SessionLike;
    session.user = {
      id: user.id,
      _id: user._id,
      email: user.email,
      role: user.role,
      verifiedAt: user.verifiedAt,
    };
    if (typeof session.save === 'function') {
      await session.save();
    }

    this.eventBus.publish(
      LoginSucceededEvent.create({
        aggregateId: user._id,
        version: 0,
        userId: user.id,
        email,
        ip,
        userAgent,
      }),
    );

    return { status: 'ok' };
  }

  private async _issueOtp(email: string, userId: number): Promise<void> {
    const ttl = Number(
      this.configService.get<number>('OTP_TTL_SECONDS') ?? 600,
    );
    const length = Number(this.configService.get<number>('OTP_LENGTH') ?? 6);
    const code = this.otpService.generate(length);
    const codeHash = await this.otpService.hash(code);
    const expiresAt = new Date(Date.now() + ttl * 1000);
    await this.otpRepo.invalidateActiveByEmailAndPurpose(email, OTP_PURPOSE);
    await this.otpRepo.createRecord({
      email,
      codeHash,
      expiresAt,
      purpose: OTP_PURPOSE,
      userId,
    });
    await this.emailService.sendOtpEmail(email, code, ttl);
  }
}
