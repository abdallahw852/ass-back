export class MarkRfqViewedCommand {
  constructor(
    public readonly rfqPublicId: string,
    public readonly viewerRole: 'buyer' | 'supplier',
    public readonly viewerUserId: number,
  ) {}
}
