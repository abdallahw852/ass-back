import type {
  ConversationSubjectType,
  ParticipantRole,
} from '../../domain/conversation.types';

export interface OpenConversationParticipantInput {
  userId: number;
  role: ParticipantRole;
}

export class OpenConversationCommand {
  constructor(
    public readonly subjectType: ConversationSubjectType,
    public readonly subjectId: string,
    public readonly scopeKey: string | null,
    public readonly participants: OpenConversationParticipantInput[],
  ) {}
}
