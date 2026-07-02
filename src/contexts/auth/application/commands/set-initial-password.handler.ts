import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { JwtService } from '@nestjs/jwt';
import { SetInitialPasswordCommand } from './set-initial-password.command';
import { USER_REPOSITORY } from '../../domain/repositories/user.repository.interface';
import type { IUserRepository } from '../../domain/repositories/user.repository.interface';
import { PASSWORD_PORT } from '../ports/password.port';
import type { IPasswordPort } from '../ports/password.port';
import { RedisService } from '../../../../shared/infrastructure/services/redis.service';
import { validatePassword } from '../../domain/value-objects/password-policy';
import {
  AuthInvalidCredentialsException,
  AuthPasswordPolicyViolationException,
} from '../../domain/auth.exceptions';

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

export type SetInitialPasswordResult = { status: 'ok' };

const NONCE_PREFIX = 'pwd_setup:';

@CommandHandler(SetInitialPasswordCommand)
export class SetInitialPasswordHandler implements ICommandHandler<
  SetInitialPasswordCommand,
  SetInitialPasswordResult
> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepo: IUserRepository,
    @Inject(PASSWORD_PORT)
    private readonly passwordPort: IPasswordPort,
    private readonly redisService: RedisService,
    private readonly jwtService: JwtService,
  ) {}

  async execute(
    command: SetInitialPasswordCommand,
  ): Promise<SetInitialPasswordResult> {
    let payload: { sub: string; nonce: string };
    try {
      payload = this.jwtService.verify<{ sub: string; nonce: string }>(
        command.passwordSetupToken,
      );
    } catch {
      throw new AuthInvalidCredentialsException();
    }

    const publicId = payload.sub;
    const nonceKey = `${NONCE_PREFIX}${publicId}`;
    const storedNonce = await this.redisService.getdel(nonceKey);
    if (!storedNonce || storedNonce !== payload.nonce) {
      throw new AuthInvalidCredentialsException();
    }

    const validation = validatePassword(command.password);
    if (!validation.valid) {
      throw new AuthPasswordPolicyViolationException(validation.violations);
    }

    const user = await this.userRepo.findByPublicId(publicId);
    if (!user) throw new AuthInvalidCredentialsException();

    if (!user.requiresPasswordSetup) {
      throw new AuthInvalidCredentialsException();
    }

    const passwordHash = await this.passwordPort.hash(command.password);
    await this.userRepo.updatePassword(user.id, passwordHash, new Date());
    await this.userRepo.markRequiresPasswordSetup(user.id, false);

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

    return { status: 'ok' };
  }
}
