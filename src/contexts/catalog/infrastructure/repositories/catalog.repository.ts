import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductOrmEntity } from '../../../product/infrastructure/persistence/product.orm-entity';
import { ProductStatus } from '../../../product/domain/enums';
import { applyTrigramSearch } from '../../../../shared/infrastructure/persistence/trigram-search';

export interface CatalogProductCard {
  _id: string;
  name: string;
  mainTitle: string | null;
  promotionalTitle: string | null;
  images: string[];
  type: string;
  costPrice: number;
  shippingPrice: number;
  discountedPrice: number | null;
  discountPercentage: number | null;
  currency: string;
  moq: number;
  unitCount: number | null;
  unitType: string | null;
  condition: string;
  categoryId: string | null;
  subcategoryId: string | null;
  viewCount: number;
  reviewAvgRating: number;
  reviewCount: number;
  supplierId: number;
  supplierPublicId: string;
  supplierCompanyName: string;
  supplierCountry: string;
  supplierLogoUrl: string | null;
  supplierIsVerified: boolean;
  supplierYearsInBusiness: number;
  createdAt: Date;
}

export interface CatalogProductDetail extends CatalogProductCard {
  description: string | null;
  stockQuantity: number;
  requiresShipping: boolean;
  optionGroups: { name: string; values: string[] }[];
  attributes: { key: string; value: string; group?: string }[];
  variants: {
    _id: string;
    sku: string | null;
    color: string | null;
    size: string | null;
    price: number;
    quantity: number;
    isActive: boolean;
  }[];
}

export interface ListCatalogFilters {
  categoryId?: string;
  subcategoryId?: string;
  condition?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  sortBy?: 'price_asc' | 'price_desc' | 'rating' | 'newest' | 'most_viewed';
  page?: number;
  limit?: number;
}

@Injectable()
export class CatalogRepository {
  constructor(
    @InjectRepository(ProductOrmEntity, 'write')
    private readonly productRepo: Repository<ProductOrmEntity>,
  ) {}

  async findActive(
    filters: ListCatalogFilters,
  ): Promise<{ items: CatalogProductCard[]; total: number }> {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 20, 100);
    const offset = (page - 1) * limit;

    const qb = this.productRepo
      .createQueryBuilder('p')
      .innerJoin('p.supplier', 's')
      .select([
        'p._id               AS "_id"',
        'p.name              AS "name"',
        'p."mainTitle"       AS "mainTitle"',
        'p."promotionalTitle" AS "promotionalTitle"',
        'p.images            AS "images"',
        'p.type              AS "type"',
        'p."costPrice"       AS "costPrice"',
        'p."shippingPrice"   AS "shippingPrice"',
        'p."discountedPrice" AS "discountedPrice"',
        'p."discountPercentage" AS "discountPercentage"',
        'p.currency          AS "currency"',
        'p.moq               AS "moq"',
        'p."unitCount"       AS "unitCount"',
        'p."unitType"        AS "unitType"',
        'p.condition         AS "condition"',
        'p."categoryId"      AS "categoryId"',
        'p."subcategoryId"   AS "subcategoryId"',
        'p."viewCount"       AS "viewCount"',
        'p."createdAt"       AS "createdAt"',
        's.id                AS "supplierId"',
        's._id               AS "supplierPublicId"',
        's."companyName"     AS "supplierCompanyName"',
        's.country           AS "supplierCountry"',
        's."logoUrl"         AS "supplierLogoUrl"',
        's."isVerified"      AS "supplierIsVerified"',
        `EXTRACT(YEAR FROM AGE(NOW(), s."createdAt"))::int AS "supplierYearsInBusiness"`,
        // Review stats will be added in Phase 2; default to 0 for now
        '0::decimal          AS "reviewAvgRating"',
        '0::int              AS "reviewCount"',
      ])
      .where('p.status = :status', { status: ProductStatus.ACTIVE })
      .andWhere('p."deletedAt" IS NULL');

    if (filters.categoryId) {
      qb.andWhere('p."categoryId" = :categoryId', {
        categoryId: filters.categoryId,
      });
    }
    if (filters.subcategoryId) {
      qb.andWhere('p."subcategoryId" = :subcategoryId', {
        subcategoryId: filters.subcategoryId,
      });
    }
    if (filters.condition) {
      qb.andWhere('p.condition = :condition', { condition: filters.condition });
    }
    if (filters.minPrice !== undefined) {
      qb.andWhere('p."costPrice" >= :minPrice', { minPrice: filters.minPrice });
    }
    if (filters.maxPrice !== undefined) {
      qb.andWhere('p."costPrice" <= :maxPrice', { maxPrice: filters.maxPrice });
    }
    // Trigram search: matches substrings, partial tokens, and light typos.
    // Returns a relevance expression used for ranking when no explicit sort is chosen.
    let relevanceExpr: string | null = null;
    if (filters.search) {
      relevanceExpr = applyTrigramSearch(qb, {
        term: filters.search,
        columns: [
          { expr: 'p.name', weight: 3 },
          { expr: 'p."mainTitle"', weight: 2 },
          { expr: 'p.description', weight: 1 },
        ],
      });
    }

    switch (filters.sortBy) {
      case 'price_asc':
        qb.orderBy('p."costPrice"', 'ASC');
        break;
      case 'price_desc':
        qb.orderBy('p."costPrice"', 'DESC');
        break;
      case 'most_viewed':
        qb.orderBy('p."viewCount"', 'DESC');
        break;
      case 'newest':
        qb.orderBy('p."createdAt"', 'DESC');
        break;
      default:
        // No explicit sort: rank by text relevance when a search term is present,
        // otherwise fall back to newest-first.
        if (relevanceExpr) {
          qb.orderBy(relevanceExpr, 'DESC').addOrderBy('p."createdAt"', 'DESC');
        } else {
          qb.orderBy('p."createdAt"', 'DESC');
        }
        break;
    }

    const [items, total] = await Promise.all([
      qb.offset(offset).limit(limit).getRawMany<CatalogProductCard>(),
      qb.getCount(),
    ]);

    return { items, total };
  }

  async findOneActive(productId: string): Promise<CatalogProductDetail | null> {
    const row = await this.productRepo
      .createQueryBuilder('p')
      .innerJoin('p.supplier', 's')
      .leftJoinAndSelect('p.variants', 'v')
      .select([
        'p._id               AS "_id"',
        'p.name              AS "name"',
        'p."mainTitle"       AS "mainTitle"',
        'p."promotionalTitle" AS "promotionalTitle"',
        'p.description       AS "description"',
        'p.images            AS "images"',
        'p.type              AS "type"',
        'p."costPrice"       AS "costPrice"',
        'p."shippingPrice"   AS "shippingPrice"',
        'p."discountedPrice" AS "discountedPrice"',
        'p."discountPercentage" AS "discountPercentage"',
        'p.currency          AS "currency"',
        'p.moq               AS "moq"',
        'p."unitCount"       AS "unitCount"',
        'p."unitType"        AS "unitType"',
        'p.condition         AS "condition"',
        'p."categoryId"      AS "categoryId"',
        'p."subcategoryId"   AS "subcategoryId"',
        'p."stockQuantity"   AS "stockQuantity"',
        'p."requiresShipping" AS "requiresShipping"',
        'p."optionGroups"    AS "optionGroups"',
        'p.attributes        AS "attributes"',
        'p."viewCount"       AS "viewCount"',
        'p."createdAt"       AS "createdAt"',
        's.id                AS "supplierId"',
        's._id               AS "supplierPublicId"',
        's."companyName"     AS "supplierCompanyName"',
        's.country           AS "supplierCountry"',
        's."logoUrl"         AS "supplierLogoUrl"',
        's."isVerified"      AS "supplierIsVerified"',
        `EXTRACT(YEAR FROM AGE(NOW(), s."createdAt"))::int AS "supplierYearsInBusiness"`,
        '0::decimal          AS "reviewAvgRating"',
        '0::int              AS "reviewCount"',
      ])
      .where('p._id = :id', { id: productId })
      .andWhere('p.status = :status', { status: ProductStatus.ACTIVE })
      .andWhere('p."deletedAt" IS NULL')
      .getRawOne<CatalogProductDetail & { variants?: unknown }>();

    if (!row) return null;

    // Load variants separately to avoid column aliasing conflicts
    const variants = (await this.productRepo
      .createQueryBuilder('p')
      .innerJoin('p.variants', 'v')
      .select([
        'v._id       AS "_id"',
        'v.sku       AS "sku"',
        'v.color     AS "color"',
        'v.size      AS "size"',
        'v.price     AS "price"',
        'v.quantity  AS "quantity"',
        'v."isActive" AS "isActive"',
      ])
      .where('p._id = :id', { id: productId })
      .andWhere('v."isActive" = true')
      .getRawMany()) as unknown as {
      _id: string;
      sku: string | null;
      color: string | null;
      size: string | null;
      price: number;
      quantity: number;
      isActive: boolean;
    }[];

    return { ...row, variants };
  }

  async incrementViewCount(productId: string): Promise<void> {
    await this.productRepo
      .createQueryBuilder()
      .update(ProductOrmEntity)
      .set({ viewCount: () => '"viewCount" + 1' })
      .where('_id = :id', { id: productId })
      .execute();
  }

  async findRecentlyArrived(limit = 12): Promise<CatalogProductCard[]> {
    const { items } = await this.findActive({ sortBy: 'newest', limit });
    return items;
  }

  async findBestDeals(limit = 12): Promise<CatalogProductCard[]> {
    const qb = this.productRepo
      .createQueryBuilder('p')
      .innerJoin('p.supplier', 's')
      .select(this.cardSelects())
      .where('p.status = :status', { status: ProductStatus.ACTIVE })
      .andWhere('p."deletedAt" IS NULL')
      .andWhere('p."discountedPrice" IS NOT NULL')
      .orderBy('p."discountPercentage"', 'DESC')
      .limit(limit);

    return qb.getRawMany<CatalogProductCard>();
  }

  async findTopRated(limit = 12): Promise<CatalogProductCard[]> {
    // Phase 2 will add real review joins; for now sort by viewCount as proxy
    const { items } = await this.findActive({ sortBy: 'most_viewed', limit });
    return items;
  }

  // ── Private helpers ────────────────────────────────────────

  private cardSelects(): string[] {
    return [
      'p._id               AS "_id"',
      'p.name              AS "name"',
      'p."mainTitle"       AS "mainTitle"',
      'p."promotionalTitle" AS "promotionalTitle"',
      'p.images            AS "images"',
      'p.type              AS "type"',
      'p."costPrice"       AS "costPrice"',
      'p."shippingPrice"   AS "shippingPrice"',
      'p."discountedPrice" AS "discountedPrice"',
      'p."discountPercentage" AS "discountPercentage"',
      'p.currency          AS "currency"',
      'p.moq               AS "moq"',
      'p."unitCount"       AS "unitCount"',
      'p."unitType"        AS "unitType"',
      'p.condition         AS "condition"',
      'p."categoryId"      AS "categoryId"',
      'p."subcategoryId"   AS "subcategoryId"',
      'p."viewCount"       AS "viewCount"',
      'p."createdAt"       AS "createdAt"',
      's.id                AS "supplierId"',
      's._id               AS "supplierPublicId"',
      's."companyName"     AS "supplierCompanyName"',
      's.country           AS "supplierCountry"',
      's."logoUrl"         AS "supplierLogoUrl"',
      's."isVerified"      AS "supplierIsVerified"',
      `EXTRACT(YEAR FROM AGE(NOW(), s."createdAt"))::int AS "supplierYearsInBusiness"`,
      '0::decimal          AS "reviewAvgRating"',
      '0::int              AS "reviewCount"',
    ];
  }
}
