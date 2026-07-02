export class GetConversationQuery {
  constructor(
    public readonly conversationPublicId: string,
    public readonly userId: number,
  ) {}
}
