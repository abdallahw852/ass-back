export class UpdateBusinessInfoCommand {
  constructor(
    public readonly userId: number,
    public readonly input: {
      companyName?: string;
      registrationNumber?: string;
      taxNumber?: string;
      activityType?: string;
      businessSize?: string;
      yearEstablished?: number;
      detailedAddress?: string;
      businessDescription?: string;
      latitude?: number;
      longitude?: number;
      logoUrl?: string | null;
      removeLogo?: boolean;
    },
  ) {}
}
