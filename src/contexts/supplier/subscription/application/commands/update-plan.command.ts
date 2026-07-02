export class UpdatePlanCommand {
  constructor(
    public readonly publicId: string,
    public readonly name?: string,
    public readonly displayNameAr?: string,
    public readonly displayNameEn?: string,
    public readonly price?: number,
    public readonly currency?: string,
    public readonly billingCycle?: string,
    public readonly commissionRate?: number,
    public readonly features?: string[],
    public readonly entitlements?: Record<string, boolean | number>,
    public readonly isDefault?: boolean,
    public readonly isActive?: boolean,
  ) {}
}
