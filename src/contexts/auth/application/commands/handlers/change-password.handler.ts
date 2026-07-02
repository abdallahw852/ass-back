import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ChangePasswordCommand } from '../change-password.command';
import { USER_REPOSITORY } from '../../../domain/repositories/user.repository.interface';
import type { IUserRepository } from '../../../domain/repositories/user.repository.interface';
import { PASSWORD_PORT } from '../../ports/password.port';
import type { IPasswordPort } from '../../ports/password.port';
import { validatePassword } from '../../../domain/value-objects/password-policy';
import {
  AuthInvalidCredentialsException,
  AuthPasswordPolicyViolationException,
  AuthUserNotFoundException,
} from '../../../domain/auth.exceptions';

export type ChangePasswordResult = { status: 'ok' };

@CommandHandler(ChangePasswordCommand)
export class ChangePasswordHandler implements ICommandHandler<
  ChangePasswordCommand,
  ChangePasswordResult
> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepo: IUserRepository,
    @Inject(PASSWORD_PORT)
    private readonly passwordPort: IPasswordPort,
  ) {}

  async execute(command: ChangePasswordCommand): Promise<ChangePasswordResult> {
    const user = await this.userRepo.findById(command.userId);
    if (!user) throw new AuthUserNotFoundException();

    if (!user.passwordHash) {
      throw new AuthInvalidCredentialsException();
    }

    const matches = await this.passwordPort.compare(
      command.currentPassword,
      user.passwordHash,
    );
    if (!matches) {
      throw new AuthInvalidCredentialsException();
    }

    const validation = validatePassword(command.newPassword);
    if (!validation.valid) {
      throw new AuthPasswordPolicyViolationException(validation.violations);
    }

    const passwordHash = await this.passwordPort.hash(command.newPassword);
    await this.userRepo.updatePassword(user.id, passwordHash, new Date());

    return { status: 'ok' };
  }
}
