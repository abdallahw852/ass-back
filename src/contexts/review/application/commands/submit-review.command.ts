export class SubmitReviewCommand {
  constructor(
    public readonly productId: number,
    public readonly buyerId: number,
    public readonly rating: number,
    public readonly title: string | null,
    public readonly body: string | null,
    public readonly images: string[],
    public readonly isVerifiedPurchase: boolean,
  ) {}
}
