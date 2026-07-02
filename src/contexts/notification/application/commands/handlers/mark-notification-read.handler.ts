import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { MarkNotificationReadCommand } from '../mark-notification-read.command';
import { NOTIFICATION_REPOSITORY } from '../../../domain/notification.repository.interface';
import type { INotificationRepository } from '../../../domain/notification.repository.interface';

@CommandHandler(MarkNotificationReadCommand)
export class MarkNotificationReadHandler implements ICommandHandler<MarkNotificationReadCommand> {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notificationRepo: INotificationRepository,
  ) {}

  async execute(
    command: MarkNotificationReadCommand,
  ): Promise<{ ok: boolean }> {
    await this.notificationRepo.markRead(
      command.notificationPublicId,
      command.userId,
    );
    return { ok: true };
  }
}
