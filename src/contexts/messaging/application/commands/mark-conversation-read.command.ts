export class MarkConversationReadCommand {
  constructor(
    public readonly conversationPublicId: string,
    public readonly userId: number,
    public readonly upToMessagePublicId: string,
  ) {}
}
