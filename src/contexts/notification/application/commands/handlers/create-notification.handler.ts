import { CommandHandler, EventBus, type ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { CreateNotificationCommand } from '../create-notification.command';
import { NOTIFICATION_REPOSITORY } from '../../../domain/notification.repository.interface';
import type { INotificationRepository } from '../../../domain/notification.repository.interface';
import { NotificationCreatedEvent } from '../../events/notification-created.event';

@CommandHandler(CreateNotificationCommand)
export class CreateNotificationHandler implements ICommandHandler<CreateNotificationCommand> {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notificationRepo: INotificationRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: CreateNotificationCommand) {
    const notification = await this.notificationRepo.create({
      userId: command.userId,
      type: command.type,
      payload: command.payload,
    });

    this.eventBus.publish(new NotificationCreatedEvent(notification));

    return notification;
  }
}
