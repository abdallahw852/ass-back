import type { Category } from './category.entity';

export const CATEGORY_REPOSITORY = Symbol('CATEGORY_REPOSITORY');

export interface ICategoryRepository {
  findByPublicId(id: string): Promise<Category | null>;
  findBySlug(slug: string, parentId?: number | null): Promise<Category | null>;
  findByInternalId(id: number): Promise<Category | null>;
  findAll(onlyActive?: boolean): Promise<Category[]>;
  findChildren(
    parentId: number | null,
    onlyActive?: boolean,
  ): Promise<Category[]>;
  save(category: Category): Promise<Category>;
  update(category: Category): Promise<Category>;
  softDelete(internalId: number): Promise<void>;
}
