export class MessageSentEvent {
  constructor(
    public readonly conversationPublicId: string,
    public readonly conversationInternalId: number,
    public readonly messagePublicId: string,
    public readonly senderUserId: number,
    public readonly recipientUserIds: number[],
    public readonly body: string,
    public readonly createdAt: Date,
  ) {}
}
