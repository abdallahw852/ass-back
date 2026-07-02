export class CreatePlanCommand {
  constructor(
    public readonly name: string,
    public readonly displayNameAr: string,
    public readonly displayNameEn: string,
    public readonly price: number,
    public readonly currency: string,
    public readonly billingCycle: string,
    public readonly commissionRate: number,
    public readonly features: string[],
    public readonly isActive: boolean,
    public readonly isDefault?: boolean,
  ) {}
}
