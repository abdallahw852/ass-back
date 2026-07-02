export class ConversationReadEvent {
  constructor(
    public readonly conversationPublicId: string,
    public readonly userId: number,
  ) {}
}
