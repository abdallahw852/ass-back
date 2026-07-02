export type CompleteSupplierProfileInput = {
  companyNameAr?: string;
  companyNameEn?: string;
  taxNumber?: string;
  ownerName?: string;
  nationalId?: string;
  city?: string;
  detailedAddress?: string;
  bankName?: string;
  iban?: string;
  accountHolderName?: string;
  businessDescription?: string;
  logoUrl?: string;
  galleryUrls?: string[];
};

export class CompleteSupplierProfileCommand {
  constructor(
    public readonly userId: number,
    public readonly input: CompleteSupplierProfileInput,
  ) {}
}
