import { StorageService } from '../../../../shared/infrastructure/services/storage.service';

export class SupplierFormatter {
  static async supplier(
    raw: Record<string, unknown>,
    storage: StorageService,
  ): Promise<Record<string, unknown>> {
    const sign = (url: string | null | undefined) =>
      url ? storage.getSignedUrl({ url }) : Promise.resolve(url ?? null);

    const [registrationFileUrl, logoUrl, galleryUrls] = await Promise.all([
      sign(raw.registrationFileUrl as string | null),
      sign(raw.logoUrl as string | null),
      Promise.all(
        ((raw.galleryUrls as string[]) ?? []).map((url) =>
          storage.getSignedUrl({ url }),
        ),
      ),
    ]);

    return {
      id: raw._id as string,
      userId: raw.userId as string,
      supplierNumber: (raw.supplierCode ?? null) as string | null,
      companyName: raw.companyName as string,
      phoneNumber: raw.phoneNumber as string,
      country: raw.country as string,
      activityType: raw.activityType as string,
      businessSize: raw.businessSize as string,
      registrationNumber: raw.registrationNumber as string,
      registrationFileUrl,
      notes: (raw.notes ?? null) as string | null,
      companyNameAr: (raw.companyNameAr ?? null) as string | null,
      companyNameEn: (raw.companyNameEn ?? null) as string | null,
      taxNumber: (raw.taxNumber ?? null) as string | null,
      ownerName: (raw.ownerName ?? null) as string | null,
      nationalId: (raw.nationalId ?? null) as string | null,
      city: (raw.city ?? null) as string | null,
      detailedAddress: (raw.detailedAddress ?? null) as string | null,
      logoUrl,
      galleryUrls,
      bankName: (raw.bankName ?? null) as string | null,
      iban: (raw.iban ?? null) as string | null,
      accountHolderName: (raw.accountHolderName ?? null) as string | null,
      businessDescription: (raw.businessDescription ?? null) as string | null,
      yearEstablished: (raw.yearEstablished ?? null) as number | null,
      latitude: (raw.latitude ?? null) as number | null,
      longitude: (raw.longitude ?? null) as number | null,
      verificationStatus: (raw.verificationStatus ?? null) as string | null,
      isVerified: raw.isVerified as boolean,
      rejectionReason: (raw.rejectionReason ?? null) as string | null,
      createdAt: raw.createdAt as Date,
      updatedAt: raw.updatedAt as Date,
    };
  }

  static async document(
    raw: Record<string, unknown>,
    storage: StorageService,
  ): Promise<Record<string, unknown>> {
    const fileUrl = raw.fileUrl
      ? await storage.getSignedUrl({ url: raw.fileUrl as string })
      : null;

    return {
      id: raw._id as string,
      documentType: raw.documentType as string,
      documentName: raw.documentName as string,
      fileUrl,
      createdAt: raw.createdAt as Date,
    };
  }

  static async documents(
    raws: Record<string, unknown>[],
    storage: StorageService,
  ): Promise<Record<string, unknown>[]> {
    return Promise.all(raws.map((d) => SupplierFormatter.document(d, storage)));
  }

  static async listItem(
    raw: Record<string, unknown>,
    storage: StorageService,
  ): Promise<Record<string, unknown>> {
    const logoUrl = raw.logoUrl
      ? await storage.getSignedUrl({ url: raw.logoUrl as string })
      : null;

    return {
      id: raw.id as string,
      companyName: raw.companyName as string,
      companyNameAr: (raw.companyNameAr ?? null) as string | null,
      companyNameEn: (raw.companyNameEn ?? null) as string | null,
      country: raw.country as string,
      city: (raw.city ?? null) as string | null,
      supplierType: (raw.supplierType ?? null) as string | null,
      isVerified: raw.isVerified as boolean,
      yearEstablished: (raw.yearEstablished ?? null) as number | null,
      logoUrl,
    };
  }

  static async listItems(
    raws: Record<string, unknown>[],
    storage: StorageService,
  ): Promise<Record<string, unknown>[]> {
    return Promise.all(raws.map((r) => SupplierFormatter.listItem(r, storage)));
  }
}
