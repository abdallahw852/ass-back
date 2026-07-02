import { Inject } from '@nestjs/common';
import { CommandHandler, EventBus, type ICommandHandler } from '@nestjs/cqrs';
import { CONVERSATION_REPOSITORY } from '../../../domain/conversation.repository.interface';
import type { IConversationRepository } from '../../../domain/conversation.repository.interface';
import { MESSAGE_REPOSITORY } from '../../../domain/message.repository.interface';
import type { IMessageRepository } from '../../../domain/message.repository.interface';
import {
  ConversationNotFoundException,
  NotAParticipantException,
} from '../../../domain/messaging.exceptions';
import { MarkConversationReadCommand } from '../mark-conversation-read.command';
import { ConversationReadEvent } from '../../events/conversation-read.event';

@CommandHandler(MarkConversationReadCommand)
export class MarkConversationReadHandler implements ICommandHandler<MarkConversationReadCommand> {
  constructor(
    @Inject(CONVERSATION_REPOSITORY)
    private readonly conversationRepository: IConversationRepository,
    @Inject(MESSAGE_REPOSITORY)
    private readonly messageRepository: IMessageRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: MarkConversationReadCommand): Promise<{ ok: true }> {
    const conversation =
      await this.conversationRepository.findByPublicIdWithParticipants(
        command.conversationPublicId,
      );
    if (!conversation) {
      throw new ConversationNotFoundException(command.conversationPublicId);
    }

    const participant = conversation.participants?.find(
      (p) => p.userId === command.userId,
    );
    if (!participant) {
      throw new NotAParticipantException();
    }

    const message = await this.messageRepository.findByPublicId(
      command.upToMessagePublicId,
    );
    if (!message || message.conversationId !== conversation.id) {
      // Silent no-op — don't leak conversation membership.
      return { ok: true };
    }

    // Only advance the marker; never move it backward.
    if (
      participant.lastReadMessageId === null ||
      participant.lastReadMessageId < message.id
    ) {
      await this.conversationRepository.updateParticipantLastRead(
        conversation.id,
        command.userId,
        message.id,
      );
    }

    this.eventBus.publish(
      new ConversationReadEvent(command.conversationPublicId, command.userId),
    );

    return { ok: true };
  }
}
