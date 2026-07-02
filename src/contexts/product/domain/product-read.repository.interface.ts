import type { ProductOrmEntity } from '../infrastructure/persistence/product.orm-entity';

export interface IProductReadRepository {
  findByPublicId(publicId: string): Promise<ProductOrmEntity | null>;

  findBySupplierId(
    supplierId: number,
    options?: {
      search?: string;
      type?: string;
      status?: string;
      categoryId?: string;
      page?: number;
      limit?: number;
    },
  ): Promise<{ items: ProductOrmEntity[]; total: number }>;

  findAll(options?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: ProductOrmEntity[]; total: number }>;
}

export const PRODUCT_READ_REPOSITORY = Symbol('PRODUCT_READ_REPOSITORY');
