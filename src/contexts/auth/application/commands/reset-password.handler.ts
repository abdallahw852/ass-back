import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { JwtService } from '@nestjs/jwt';
import { ResetPasswordCommand } from './reset-password.command';
import { USER_REPOSITORY } from '../../domain/repositories/user.repository.interface';
import type { IUserRepository } from '../../domain/repositories/user.repository.interface';
import { PASSWORD_PORT } from '../ports/password.port';
import type { IPasswordPort } from '../ports/password.port';
import { RedisService } from '../../../../shared/infrastructure/services/redis.service';
import { validatePassword } from '../../domain/value-objects/password-policy';
import {
  AuthInvalidResetTokenException,
  AuthPasswordPolicyViolationException,
} from '../../domain/auth.exceptions';

export type ResetPasswordResult = { status: 'ok' };

const NONCE_PREFIX = 'pwd_reset:';

type ResetTokenPayload = {
  id: number;
  email: string;
  nonce: string;
  typ?: string;
};

@CommandHandler(ResetPasswordCommand)
export class ResetPasswordHandler implements ICommandHandler<
  ResetPasswordCommand,
  ResetPasswordResult
> {
  private readonly logger = new Logger(ResetPasswordHandler.name);

  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepo: IUserRepository,
    @Inject(PASSWORD_PORT)
    private readonly passwordPort: IPasswordPort,
    private readonly redisService: RedisService,
    private readonly jwtService: JwtService,
  ) {}

  async execute(command: ResetPasswordCommand): Promise<ResetPasswordResult> {
    const validation = validatePassword(command.password);
    if (!validation.valid) {
      throw new AuthPasswordPolicyViolationException(validation.violations);
    }

    if (!command.token) {
      throw new AuthInvalidResetTokenException();
    }

    let payload: ResetTokenPayload;
    try {
      payload = this.jwtService.verify<ResetTokenPayload>(command.token);
    } catch {
      throw new AuthInvalidResetTokenException();
    }

    if (
      payload.typ !== 'pwd_reset' ||
      !payload.id ||
      !payload.email ||
      !payload.nonce
    ) {
      throw new AuthInvalidResetTokenException();
    }

    const nonceKey = `${NONCE_PREFIX}${payload.email}`;
    const storedNonce = await this.redisService.getdel(nonceKey);
    if (!storedNonce || storedNonce !== payload.nonce) {
      throw new AuthInvalidResetTokenException();
    }

    const user = await this.userRepo.findById(payload.id);
    if (!user) throw new AuthInvalidResetTokenException();

    const passwordHash = await this.passwordPort.hash(command.password);
    await this.userRepo.updatePassword(user.id, passwordHash, new Date());
    if (user.requiresPasswordSetup) {
      await this.userRepo.markRequiresPasswordSetup(user.id, false);
    }

    this.logger.debug(
      `[reset-password] password updated for user publicId=${user._id}`,
    );

    return { status: 'ok' };
  }
}
