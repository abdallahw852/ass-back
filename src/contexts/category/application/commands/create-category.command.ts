export class CreateCategoryCommand {
  constructor(
    public readonly name: string,
    public readonly slug: string,
    public readonly nameAr?: string | null,
    public readonly parentId?: number | null,
    public readonly imageUrl?: string | null,
    public readonly iconUrl?: string | null,
    public readonly description?: string | null,
    public readonly sortOrder?: number,
    public readonly level?: number,
  ) {}
}
