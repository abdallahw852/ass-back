export class ReviewFormatter {
  static review(raw: Record<string, unknown>): Record<string, unknown> {
    return {
      id: raw.id as string,
      rating: raw.rating as number,
      title: (raw.title ?? null) as string | null,
      body: (raw.body ?? null) as string | null,
      images: (raw.images ?? []) as string[],
      isVerifiedPurchase: raw.isVerifiedPurchase as boolean,
      helpfulCount: raw.helpfulCount as number,
      createdAt: raw.createdAt as Date,
      updatedAt: raw.updatedAt as Date,
    };
  }

  static list(raw: {
    items: Record<string, unknown>[];
    total: number;
  }): Record<string, unknown> {
    return {
      items: raw.items.map((r) => ReviewFormatter.review(r)),
      total: raw.total,
    };
  }

  static summary(raw: {
    averageRating: number;
    totalCount: number;
    distribution: Record<number, number>;
  }): Record<string, unknown> {
    return {
      averageRating: raw.averageRating,
      totalCount: raw.totalCount,
      distribution: raw.distribution,
    };
  }
}
