export class ListMessagesQuery {
  constructor(
    public readonly conversationPublicId: string,
    public readonly userId: number,
    public readonly limit = 30,
    public readonly beforeMessagePublicId?: string,
  ) {}
}
