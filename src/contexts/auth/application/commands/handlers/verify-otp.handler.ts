import { Inject, UnauthorizedException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import { VerifyOtpCommand } from '../verify-otp.command';
import { OTP_CODE_REPOSITORY } from '../../../domain/repositories/otp-code.repository.interface';
import type { IOtpCodeRepository } from '../../../domain/repositories/otp-code.repository.interface';
import { USER_REPOSITORY } from '../../../domain/repositories/user.repository.interface';
import type { IUserRepository } from '../../../domain/repositories/user.repository.interface';
import { OtpService } from '../../../../../shared/infrastructure/services/otp.service';
import { RedisService } from '../../../../../shared/infrastructure/services/redis.service';
import {
  AuthOtpInvalidOrExpiredException,
  AuthOtpLockedException,
  AuthUserSuspendedException,
} from '../../../domain/auth.exceptions';
import { UserRole } from '../../../domain/enums/user-role.enum';

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

export type VerifyOtpResult =
  | { status: 'verified'; passwordSetupRequired?: false }
  | { passwordSetupRequired: true; passwordSetupToken: string }
  | { user: Record<string, unknown> };

const PURPOSE = 'signup_verification';

@CommandHandler(VerifyOtpCommand)
export class VerifyOtpHandler implements ICommandHandler<
  VerifyOtpCommand,
  VerifyOtpResult
> {
  constructor(
    @Inject(OTP_CODE_REPOSITORY)
    private readonly otpRepo: IOtpCodeRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepo: IUserRepository,
    private readonly otpService: OtpService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
  ) {}

  async execute(command: VerifyOtpCommand): Promise<VerifyOtpResult> {
    const email = command.email.trim().toLowerCase();
    const code = command.code.trim();
    const isAdminFlow = command.requiredRole === 'admin';

    const record = await this.otpRepo.findLatestByEmailAndPurpose(
      email,
      PURPOSE,
    );
    if (!record) throw new AuthOtpInvalidOrExpiredException();
    if (record.consumedAt) throw new AuthOtpInvalidOrExpiredException();
    if (new Date(record.expiresAt).getTime() < Date.now())
      throw new AuthOtpInvalidOrExpiredException();

    const maxAttempts = Number(
      this.configService.get<number>('OTP_MAX_ATTEMPTS') ?? 5,
    );
    if (record.attempts >= maxAttempts) throw new AuthOtpLockedException();

    const isValid = await this.otpService.compare(code, record.codeHash);
    if (!isValid) {
      await this.otpRepo.incrementAttempts(record.id, record.attempts + 1);
      throw new AuthOtpInvalidOrExpiredException();
    }

    const consumed = await this.otpRepo.consumeById(record.id);
    if (!consumed) throw new AuthOtpInvalidOrExpiredException();

    const user = await this.userRepo.findByEmailIncludingUnverified(email);
    if (!user) throw new AuthOtpInvalidOrExpiredException();

    if (user.status === 'suspended') {
      throw new AuthUserSuspendedException();
    }

    if (isAdminFlow) {
      if (user.role !== UserRole.ADMIN) {
        throw new UnauthorizedException('Admin account not found.');
      }
      const session = command.session as SessionLike;
      session.user = {
        id: user.id,
        _id: user._id,
        email: user.email,
        role: user.role,
        verifiedAt: user.verifiedAt ?? null,
      };
      if (typeof session.save === 'function') {
        await session.save();
      }
      return { user: user as unknown as Record<string, unknown> };
    }

    await this.userRepo.updateVerification(user.id, new Date());

    // Buyers have no further onboarding steps, so verification completes their
    // registration. Suppliers are marked complete later, at profile completion.
    if (user.role === UserRole.BUYER && !user.onboardingCompletedAt) {
      await this.userRepo.markOnboardingCompleted(user.id, new Date());
    }

    if (user.requiresPasswordSetup || !user.passwordHash) {
      const ttl = Number(
        this.configService.get<number>('PASSWORD_SETUP_TOKEN_TTL_SECONDS') ??
          600,
      );
      const nonce = randomUUID();
      const nonceKey = `pwd_setup:${user._id}`;
      await this.redisService.set(nonceKey, nonce, ttl);
      const passwordSetupToken = this.jwtService.sign(
        { sub: user._id, nonce },
        { expiresIn: `${ttl}s` },
      );
      return { passwordSetupRequired: true, passwordSetupToken };
    }

    const session = command.session as SessionLike;
    session.user = {
      id: user.id,
      _id: user._id,
      email: user.email,
      role: user.role,
      verifiedAt: new Date(),
    };
    if (typeof session.save === 'function') {
      await session.save();
    }

    return { status: 'verified' };
  }
}
