export class SubscriptionFormatter {
  static plan(raw: Record<string, unknown>): Record<string, unknown> {
    return {
      id: raw._id as string,
      name: raw.name as string,
      displayNameAr: raw.displayNameAr as string,
      displayNameEn: raw.displayNameEn as string,
      price: raw.price as string,
      currency: raw.currency as string,
      billingCycle: raw.billingCycle as string,
      commissionRate: raw.commissionRate as string,
      features: raw.features as string[],
      entitlements:
        (raw.entitlements as Record<string, boolean | number>) ?? {},
      isActive: raw.isActive as boolean,
      isDefault: raw.isDefault as boolean,
      platformPlanId: (raw.platformPlanId as string | null) ?? null,
      createdAt: raw.createdAt as Date,
      updatedAt: raw.updatedAt as Date,
    };
  }

  static subscription(
    raw: Record<string, unknown> | null,
  ): Record<string, unknown> | null {
    if (!raw) return null;
    return {
      id: raw._id as string,
      status: raw.status as string,
      cancelAtPeriodEnd: raw.cancelAtPeriodEnd as boolean,
      currentPeriodStart: raw.currentPeriodStart as Date,
      currentPeriodEnd: raw.currentPeriodEnd as Date,
      createdAt: raw.createdAt as Date,
      plan: raw.plan
        ? SubscriptionFormatter.plan(raw.plan as Record<string, unknown>)
        : null,
    };
  }
}
