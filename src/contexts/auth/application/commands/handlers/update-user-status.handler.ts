import { Inject } from '@nestjs/common';
import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UpdateUserStatusCommand } from '../update-user-status.command';
import { USER_REPOSITORY } from '../../../domain/repositories/user.repository.interface';
import type { IUserRepository } from '../../../domain/repositories/user.repository.interface';
import { AuthUserNotFoundException } from '../../../domain/auth.exceptions';
import { AppendAuditEventCommand } from '../../../../audit-log/application/commands/append-audit-event.command';
import { UserOrmEntity } from '../../../infrastructure/persistence/user.orm-entity';

@CommandHandler(UpdateUserStatusCommand)
export class UpdateUserStatusHandler implements ICommandHandler<
  UpdateUserStatusCommand,
  UserOrmEntity
> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    private readonly commandBus: CommandBus,
  ) {}

  async execute(command: UpdateUserStatusCommand): Promise<UserOrmEntity> {
    const user = await this.userRepository.findByPublicId(command.targetUserId);
    if (!user) throw new AuthUserNotFoundException();

    await this.userRepository.updateStatus(user.id, command.status);

    await this.commandBus.execute(
      new AppendAuditEventCommand(
        'user',
        user._id,
        'user.status_changed',
        command.actorId,
        command.actorRole,
        {
          status: command.status,
          reason: command.reason ?? null,
        },
      ),
    );

    user.status = command.status;
    return user;
  }
}
