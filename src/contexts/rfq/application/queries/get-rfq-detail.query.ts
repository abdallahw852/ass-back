export class GetRfqDetailQuery {
  constructor(
    public readonly rfqId: string,
    public readonly userId: number,
    public readonly role: string,
  ) {}
}
