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
import { ListMessagesQuery } from '../list-messages.query';

export interface ListMessagesItem {
  _id: string;
  body: string;
  senderId: number;
  createdAt: Date;
}

export interface ListMessagesResult {
  items: ListMessagesItem[];
  hasMore: boolean;
  nextCursor: string | null;
}

@QueryHandler(ListMessagesQuery)
export class ListMessagesHandler implements IQueryHandler<ListMessagesQuery> {
  constructor(
    @Inject(CONVERSATION_REPOSITORY)
    private readonly conversationRepository: IConversationRepository,
    @Inject(MESSAGE_REPOSITORY)
    private readonly messageRepository: IMessageRepository,
  ) {}

  async execute(query: ListMessagesQuery): Promise<ListMessagesResult> {
    const conversation =
      await this.conversationRepository.findByPublicIdWithParticipants(
        query.conversationPublicId,
      );
    if (!conversation) {
      throw new ConversationNotFoundException(query.conversationPublicId);
    }

    const isParticipant = conversation.participants?.some(
      (p) => p.userId === query.userId,
    );
    if (!isParticipant) {
      throw new NotAParticipantException();
    }

    let beforeId: number | undefined;
    if (query.beforeMessagePublicId) {
      const cursor = await this.messageRepository.findByPublicId(
        query.beforeMessagePublicId,
      );
      if (cursor && cursor.conversationId === conversation.id) {
        beforeId = cursor.id;
      }
    }

    const limit = Math.min(100, Math.max(1, query.limit ?? 30));
    const result = await this.messageRepository.listByConversationPaginated({
      conversationInternalId: conversation.id,
      limit,
      beforeId,
    });

    const items: ListMessagesItem[] = result.items.map((m) => ({
      _id: m._id,
      body: m.body,
      senderId: m.senderId,
      createdAt: m.createdAt,
    }));

    const nextCursor =
      result.hasMore && items.length > 0 ? items[items.length - 1]._id : null;

    return { items, hasMore: result.hasMore, nextCursor };
  }
}
