export class UpdateCategoryCommand {
  constructor(
    public readonly categoryId: string,
    public readonly name?: string,
    public readonly nameAr?: string | null,
    public readonly slug?: string,
    public readonly imageUrl?: string | null,
    public readonly iconUrl?: string | null,
    public readonly description?: string | null,
    public readonly sortOrder?: number,
    public readonly isActive?: boolean,
    /** Re-parent category; null means make it top-level. */
    public readonly parentId?: number | null,
  ) {}
}
