export class SendMessageCommand {
  constructor(
    public readonly conversationPublicId: string,
    public readonly senderUserId: number,
    public readonly body: string,
  ) {}
}
