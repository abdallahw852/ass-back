import type { ConversationOrmEntity } from '../infrastructure/persistence/conversation.orm-entity';
import type { ConversationParticipantOrmEntity } from '../infrastructure/persistence/conversation-participant.orm-entity';
import type {
  ConversationSubjectType,
  ParticipantRole,
} from './conversation.types';

export const CONVERSATION_REPOSITORY = Symbol('CONVERSATION_REPOSITORY');

export interface CreateConversationInput {
  subjectType: ConversationSubjectType;
  subjectId: string;
  scopeKey: string | null;
  participants: Array<{
    userId: number;
    role: ParticipantRole;
  }>;
}

export interface IConversationRepository {
  findBySubject(
    subjectType: ConversationSubjectType,
    subjectId: string,
    scopeKey: string | null,
  ): Promise<ConversationOrmEntity | null>;

  findByPublicId(publicId: string): Promise<ConversationOrmEntity | null>;

  findByPublicIdWithParticipants(
    publicId: string,
  ): Promise<ConversationOrmEntity | null>;

  findParticipant(
    conversationInternalId: number,
    userId: number,
  ): Promise<ConversationParticipantOrmEntity | null>;

  create(input: CreateConversationInput): Promise<ConversationOrmEntity>;

  touchLastMessageAt(conversationInternalId: number, at: Date): Promise<void>;

  updateParticipantLastRead(
    conversationInternalId: number,
    userId: number,
    lastReadMessageInternalId: number,
  ): Promise<void>;
}
