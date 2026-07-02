import { StorageService } from '../../../shared/infrastructure/services/storage.service';

export class AuthFormatter {
  static async user(
    raw: Record<string, unknown>,
    storage: StorageService,
  ): Promise<Record<string, unknown>> {
    const supplierPublicId =
      typeof raw.supplierPublicId === 'string'
        ? raw.supplierPublicId
        : ((raw.supplier as Record<string, unknown> | null | undefined)?._id ??
          null);

    const rawAvatar = (raw.avatar ?? null) as string | null;
    const avatar = rawAvatar
      ? await storage.getSignedUrl({ url: rawAvatar })
      : null;

    const supplier = raw.supplier as Record<string, unknown> | null | undefined;
    const supplierCode =
      typeof raw.supplierCode === 'string'
        ? raw.supplierCode
        : ((supplier?.supplierCode as string | null | undefined) ?? null);

    const isActive = !raw.deletedAt && !!(raw.verifiedAt as Date | null);
    const isVerified = !!(supplier?.isVerified as boolean | null | undefined);

    return {
      id: raw._id as string,
      email: raw.email as string,
      name: (raw.name ?? null) as string | null,
      phone: (raw.phone ?? null) as string | null,
      avatar,
      role: raw.role as string,
      permissions: (raw.permissions ?? null) as string[] | null,
      verifiedAt: (raw.verifiedAt ?? null) as Date | null,
      onboardingStep: (raw.onboardingStep ?? 'complete') as string,
      onboardingComplete: !!(raw.onboardingCompletedAt as Date | null),
      passwordSetupRequired: (raw.requiresPasswordSetup ?? false) as boolean,
      supplierPublicId: supplierPublicId as string | null,
      supplierNumber: supplierCode,
      joinedAt: raw.createdAt as Date,
      status: { active: isActive, verified: isVerified },
      createdAt: raw.createdAt as Date,
      lastLoginAt: (raw.lastLoginAt ?? null) as Date | null,
    };
  }
}
