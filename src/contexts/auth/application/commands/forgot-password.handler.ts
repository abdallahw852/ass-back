import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import { ForgotPasswordCommand } from './forgot-password.command';
import { USER_REPOSITORY } from '../../domain/repositories/user.repository.interface';
import type { IUserRepository } from '../../domain/repositories/user.repository.interface';
import { PASSWORD_PORT } from '../ports/password.port';
import type { IPasswordPort } from '../ports/password.port';
import { RedisService } from '../../../../shared/infrastructure/services/redis.service';
import { EmailService } from '../../../../shared/infrastructure/services/email.service';

export type ForgotPasswordResult = { status: 'ok' };

const NONCE_PREFIX = 'pwd_reset:';

@CommandHandler(ForgotPasswordCommand)
export class ForgotPasswordHandler implements ICommandHandler<
  ForgotPasswordCommand,
  ForgotPasswordResult
> {
  private readonly logger = new Logger(ForgotPasswordHandler.name);

  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepo: IUserRepository,
    @Inject(PASSWORD_PORT)
    private readonly passwordPort: IPasswordPort,
    private readonly redisService: RedisService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  async execute(command: ForgotPasswordCommand): Promise<ForgotPasswordResult> {
    const email = command.email.trim().toLowerCase();

    const user = await this.userRepo.findByEmailIncludingUnverified(email);

    // Always hash a dummy value to keep response time uniform regardless of
    // whether the email exists — prevents account enumeration.
    if (!user || !user.verifiedAt) {
      await this.passwordPort.dummyHash(email);
      this.logger.debug(
        `[forgot-password] silent no-op email=${email} found=${!!user} verified=${!!user?.verifiedAt}`,
      );
      return { status: 'ok' };
    }

    const ttl = Number(
      this.configService.get<number>('PASSWORD_RESET_TOKEN_TTL_SECONDS') ?? 900,
    );
    const nonce = randomUUID();
    const nonceKey = `${NONCE_PREFIX}${user.email}`;
    await this.redisService.set(nonceKey, nonce, ttl);

    const token = this.jwtService.sign(
      { id: user.id, email: user.email, nonce, typ: 'pwd_reset' },
      { expiresIn: `${ttl}s` },
    );

    const appUrl =
      this.configService.get<string>('APP_URL') ?? 'http://localhost:3000';
    const resetPath =
      this.configService.get<string>('PASSWORD_RESET_PATH') ??
      '/reset-password';
    const resetUrl = `${appUrl.replace(/\/$/, '')}${resetPath}?token=${encodeURIComponent(token)}`;

    try {
      await this.emailService.sendPasswordResetEmail(email, resetUrl, ttl);
      this.logger.debug(
        `[forgot-password] reset email sent email=${email} ttl=${ttl}s`,
      );
    } catch (err) {
      this.logger.error(
        `[forgot-password] failed to send reset email to ${email}`,
        err instanceof Error ? err.stack : err,
      );
      throw err;
    }

    return { status: 'ok' };
  }
}
