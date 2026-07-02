import { Inject } from '@nestjs/common';
import { CommandHandler, EventBus, type ICommandHandler } from '@nestjs/cqrs';
import { CONVERSATION_REPOSITORY } from '../../../domain/conversation.repository.interface';
import type { IConversationRepository } from '../../../domain/conversation.repository.interface';
import { MESSAGE_REPOSITORY } from '../../../domain/message.repository.interface';
import type { IMessageRepository } from '../../../domain/message.repository.interface';
import { ConversationSubjectType } from '../../../domain/conversation.types';
import {
  ConversationNotFoundException,
  ConversationReadOnlyException,
  EmptyMessageBodyException,
  NotAParticipantException,
} from '../../../domain/messaging.exceptions';
import { RFQ_REPOSITORY } from '../../../../rfq/domain/rfq.repository.interface';
import type { IRfqRepository } from '../../../../rfq/domain/rfq.repository.interface';
import { RfqStatus } from '../../../../rfq/domain/rfq.types';
import type { MessageOrmEntity } from '../../../infrastructure/persistence/message.orm-entity';
import { MessageSentEvent } from '../../events/message-sent.event';
import { SendMessageCommand } from '../send-message.command';

@CommandHandler(SendMessageCommand)
export class SendMessageHandler implements ICommandHandler<SendMessageCommand> {
  constructor(
    @Inject(CONVERSATION_REPOSITORY)
    private readonly conversationRepository: IConversationRepository,
    @Inject(MESSAGE_REPOSITORY)
    private readonly messageRepository: IMessageRepository,
    @Inject(RFQ_REPOSITORY)
    private readonly rfqRepository: IRfqRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(
    command: SendMessageCommand,
  ): Promise<{ message: MessageOrmEntity }> {
    const trimmed = command.body?.trim() ?? '';
    if (trimmed.length === 0) {
      throw new EmptyMessageBodyException();
    }

    const conversation =
      await this.conversationRepository.findByPublicIdWithParticipants(
        command.conversationPublicId,
      );
    if (!conversation) {
      throw new ConversationNotFoundException(command.conversationPublicId);
    }

    const isParticipant = conversation.participants?.some(
      (p) => p.userId === command.senderUserId,
    );
    if (!isParticipant) {
      throw new NotAParticipantException();
    }

    if (conversation.subjectType === ConversationSubjectType.RFQ) {
      const rfq = await this.rfqRepository.findByPublicId(
        conversation.subjectId,
      );
      if (!rfq || rfq.status !== RfqStatus.OPEN) {
        throw new ConversationReadOnlyException();
      }
    }

    const message = await this.messageRepository.create({
      conversationInternalId: conversation.id,
      senderId: command.senderUserId,
      body: trimmed,
    });

    await this.conversationRepository.touchLastMessageAt(
      conversation.id,
      message.createdAt,
    );

    const recipientUserIds = conversation.participants
      .filter((p) => p.userId !== command.senderUserId)
      .map((p) => p.userId);

    this.eventBus.publish(
      new MessageSentEvent(
        conversation._id,
        conversation.id,
        message._id,
        command.senderUserId,
        recipientUserIds,
        message.body,
        message.createdAt,
      ),
    );

    return { message };
  }
}
