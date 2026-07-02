export class GetClientChatThreadsQuery {
  constructor(
    public readonly supplierId: number,
    public readonly buyerPublicId: string,
  ) {}
}
