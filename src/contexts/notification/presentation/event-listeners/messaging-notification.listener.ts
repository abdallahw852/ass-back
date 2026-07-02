import { Inject, Logger } from '@nestjs/common';
import { CommandBus, EventsHandler, type IEventHandler } from '@nestjs/cqrs';
import { ConversationPresenceService } from '../../../messaging/infrastructure/io/conversation-presence.service';
import { MessageSentEvent } from '../../../messaging/application/events/message-sent.event';
import { ConversationReadEvent } from '../../../messaging/application/events/conversation-read.event';
import { CreateNotificationCommand } from '../../application/commands/create-notification.command';
import { NotificationType } from '../../domain/notification.types';
import { NOTIFICATION_REPOSITORY } from '../../domain/notification.repository.interface';
import type { INotificationRepository } from '../../domain/notification.repository.interface';

@EventsHandler(MessageSentEvent, ConversationReadEvent)
export class MessagingNotificationListener implements IEventHandler<
  MessageSentEvent | ConversationReadEvent
> {
  private readonly logger = new Logger(MessagingNotificationListener.name);

  constructor(
    private readonly commandBus: CommandBus,
    private readonly presenceService: ConversationPresenceService,
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notificationRepository: INotificationRepository,
  ) {}

  async handle(event: MessageSentEvent | ConversationReadEvent): Promise<void> {
    if (event instanceof MessageSentEvent) {
      await this.handleMessageSent(event);
    } else if (event instanceof ConversationReadEvent) {
      await this.handleConversationRead(event);
    }
  }

  private async handleMessageSent(event: MessageSentEvent): Promise<void> {
    for (const recipientUserId of event.recipientUserIds) {
      if (
        this.presenceService
          .getActiveUserIds(event.conversationPublicId)
          .includes(recipientUserId)
      ) {
        continue;
      }

      try {
        await this.commandBus.execute(
          new CreateNotificationCommand(
            recipientUserId,
            NotificationType.MESSAGE_RECEIVED,
            {
              conversationId: event.conversationPublicId,
              messageId: event.messagePublicId,
              senderId: event.senderUserId,
              preview: event.body.slice(0, 140),
            },
          ),
        );
      } catch (err) {
        this.logger.error(
          `Failed to create message_received notification for user ${recipientUserId}`,
          err,
        );
      }
    }
  }

  private async handleConversationRead(
    event: ConversationReadEvent,
  ): Promise<void> {
    try {
      await this.notificationRepository.markReadByConversation(
        event.userId,
        event.conversationPublicId,
      );
    } catch (err) {
      this.logger.error(
        `Failed to mark message notifications read for user ${event.userId}`,
        err,
      );
    }
  }
}
