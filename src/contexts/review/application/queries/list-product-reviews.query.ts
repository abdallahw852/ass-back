export class ListProductReviewsQuery {
  constructor(
    public readonly productId: number,
    public readonly page: number,
    public readonly limit: number,
  ) {}
}
