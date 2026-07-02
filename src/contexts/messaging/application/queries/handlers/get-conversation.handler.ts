import { Inject } from '@nestjs/common';
import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { CONVERSATION_REPOSITORY } from '../../../domain/conversation.repository.interface';
import type { IConversationRepository } from '../../../domain/conversation.repository.interface';
import { MESSAGE_REPOSITORY } from '../../../domain/message.repository.interface';
import type { IMessageRepository } from '../../../domain/message.repository.interface';
import {
  ConversationNotFoundException,
  NotAParticipantException,
} from '../../../domain/messaging.exceptions';
import { GetConversationQuery } from '../get-conversation.query';

export interface GetConversationResult {
  _id: string;
  subjectType: string;
  subjectId: string;
  scopeKey: string | null;
  lastMessageAt: Date | null;
  createdAt: Date;
  participants: Array<{ userId: number; role: string }>;
  unreadCount: number;
}

@QueryHandler(GetConversationQuery)
export class GetConversationHandler implements IQueryHandler<GetConversationQuery> {
  constructor(
    @Inject(CONVERSATION_REPOSITORY)
    private readonly conversationRepository: IConversationRepository,
    @Inject(MESSAGE_REPOSITORY)
    private readonly messageRepository: IMessageRepository,
  ) {}

  async execute(query: GetConversationQuery): Promise<GetConversationResult> {
    const conversation =
      await this.conversationRepository.findByPublicIdWithParticipants(
        query.conversationPublicId,
      );
    if (!conversation) {
      throw new ConversationNotFoundException(query.conversationPublicId);
    }

    const me = conversation.participants?.find(
      (p) => p.userId === query.userId,
    );
    if (!me) {
      throw new NotAParticipantException();
    }

    const unreadCount = await this.messageRepository.countUnreadForParticipant(
      conversation.id,
      me.lastReadMessageId,
      query.userId,
    );

    return {
      _id: conversation._id,
      subjectType: conversation.subjectType,
      subjectId: conversation.subjectId,
      scopeKey: conversation.scopeKey,
      lastMessageAt: conversation.lastMessageAt,
      createdAt: conversation.createdAt,
      participants: conversation.participants.map((p) => ({
        userId: p.userId,
        role: p.role,
      })),
      unreadCount,
    };
  }
}
