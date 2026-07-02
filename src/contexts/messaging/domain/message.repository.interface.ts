import type { MessageOrmEntity } from '../infrastructure/persistence/message.orm-entity';

export const MESSAGE_REPOSITORY = Symbol('MESSAGE_REPOSITORY');

export interface CreateMessageInput {
  conversationInternalId: number;
  senderId: number;
  body: string;
}

export interface ListMessagesOptions {
  conversationInternalId: number;
  limit: number;
  beforeId?: number;
}

export interface ListMessagesResult {
  items: MessageOrmEntity[];
  hasMore: boolean;
}

export interface IMessageRepository {
  create(input: CreateMessageInput): Promise<MessageOrmEntity>;

  listByConversationPaginated(
    options: ListMessagesOptions,
  ): Promise<ListMessagesResult>;

  findByPublicId(publicId: string): Promise<MessageOrmEntity | null>;

  countUnreadForParticipant(
    conversationInternalId: number,
    lastReadMessageInternalId: number | null,
    excludeSenderId: number,
  ): Promise<number>;
}
