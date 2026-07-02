import { StorageService } from '../../../shared/infrastructure/services/storage.service';

export class CategoryFormatter {
  static async category(
    raw: Record<string, unknown>,
    storage: StorageService,
  ): Promise<Record<string, unknown>> {
    const sign = (url: string | null | undefined) =>
      url ? storage.getSignedUrl({ url }) : Promise.resolve(url ?? null);

    const [imageUrl, iconUrl] = await Promise.all([
      sign(raw.imageUrl as string | null),
      sign(raw.iconUrl as string | null),
    ]);

    return {
      id: (raw._id ?? raw.id) as string,
      name: raw.name as string,
      nameAr: (raw.nameAr ?? null) as string | null,
      slug: raw.slug as string,
      level: raw.level as number,
      sortOrder: raw.sortOrder as number,
      isActive: raw.isActive as boolean,
      productCount: raw.productCount as number,
      imageUrl,
      iconUrl,
      description: (raw.description ?? null) as string | null,
    };
  }

  static async categoryWithChildren(
    raw: Record<string, unknown>,
    storage: StorageService,
  ): Promise<Record<string, unknown>> {
    const children = await Promise.all(
      ((raw.children ?? []) as Record<string, unknown>[]).map((c) =>
        CategoryFormatter.categoryWithChildren(c, storage),
      ),
    );
    return { ...(await CategoryFormatter.category(raw, storage)), children };
  }

  static async tree(
    raw: { categories: Record<string, unknown>[] },
    storage: StorageService,
  ): Promise<{ categories: Record<string, unknown>[] }> {
    return {
      categories: await Promise.all(
        raw.categories.map((c) =>
          CategoryFormatter.categoryWithChildren(c, storage),
        ),
      ),
    };
  }
}
