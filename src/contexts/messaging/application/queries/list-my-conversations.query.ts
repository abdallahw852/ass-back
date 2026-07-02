import type { ConversationSubjectType } from '../../domain/conversation.types';

export class ListMyConversationsQuery {
  constructor(
    public readonly userId: number,
    public readonly subjectType?: ConversationSubjectType,
    public readonly page = 1,
    public readonly limit = 20,
  ) {}
}
