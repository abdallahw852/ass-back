import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { MarkAllNotificationsReadCommand } from '../mark-all-notifications-read.command';
import { NOTIFICATION_REPOSITORY } from '../../../domain/notification.repository.interface';
import type { INotificationRepository } from '../../../domain/notification.repository.interface';

@CommandHandler(MarkAllNotificationsReadCommand)
export class MarkAllNotificationsReadHandler implements ICommandHandler<MarkAllNotificationsReadCommand> {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notificationRepo: INotificationRepository,
  ) {}

  async execute(
    command: MarkAllNotificationsReadCommand,
  ): Promise<{ ok: boolean }> {
    await this.notificationRepo.markAllRead(command.userId);
    return { ok: true };
  }
}
