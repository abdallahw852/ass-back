import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ProductOrmEntity } from '../persistence/product.orm-entity';
import type { IProductReadRepository } from '../../domain/product-read.repository.interface';
import { applyTrigramSearch } from '../../../../shared/infrastructure/persistence/trigram-search';

@Injectable()
export class ProductReadRepository implements IProductReadRepository {
  constructor(
    @InjectRepository(ProductOrmEntity, 'write')
    private readonly repository: Repository<ProductOrmEntity>,
  ) {}

  async findByPublicId(publicId: string): Promise<ProductOrmEntity | null> {
    return this.repository.findOne({
      where: { _id: publicId },
      relations: ['variants', 'bundleItems'],
    });
  }

  async findBySupplierId(
    supplierId: number,
    options?: {
      search?: string;
      type?: string;
      status?: string;
      categoryId?: string;
      page?: number;
      limit?: number;
    },
  ): Promise<{ items: ProductOrmEntity[]; total: number }> {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 20;
    const offset = (page - 1) * limit;

    // Fast path: no text search — use the efficient findAndCount shortcut.
    if (!options?.search) {
      const where: Record<string, unknown> = { supplierId };
      if (options?.type) where.type = options.type;
      if (options?.status) where.status = options.status;
      if (options?.categoryId) where.categoryId = options.categoryId;

      const [items, total] = await this.repository.findAndCount({
        where,
        relations: ['variants', 'bundleItems'],
        order: { createdAt: 'DESC' },
        skip: offset,
        take: limit,
      });
      return { items, total };
    }

    // Search path: trigram-aware matching with relevance ranking.
    // We build a helper that creates a pre-filtered QB so we can reuse the
    // same base filters for both the count query and the ID-fetch query.
    const buildBaseQb = () => {
      const qb = this.repository
        .createQueryBuilder('p')
        .where('p.supplierId = :supplierId', { supplierId });
      if (options.type) qb.andWhere('p.type = :type', { type: options.type });
      if (options.status)
        qb.andWhere('p.status = :status', { status: options.status });
      if (options.categoryId)
        qb.andWhere('p.categoryId = :categoryId', {
          categoryId: options.categoryId,
        });
      return qb;
    };

    // Count matching rows.
    const countQb = buildBaseQb();
    applyTrigramSearch(countQb, {
      term: options.search,
      columns: [{ expr: 'p.name', weight: 1 }],
    });
    const total = await countQb.getCount();
    if (total === 0) return { items: [], total: 0 };

    // Fetch the current page of internal IDs in relevance order.
    const pageQb = buildBaseQb();
    const relevance = applyTrigramSearch(pageQb, {
      term: options.search,
      columns: [{ expr: 'p.name', weight: 1 }],
    });
    const idRows = await pageQb
      .select('p.id', 'id')
      .orderBy(relevance, 'DESC')
      .addOrderBy('p.createdAt', 'DESC')
      .offset(offset)
      .limit(limit)
      .getRawMany<{ id: number }>();

    if (idRows.length === 0) return { items: [], total };

    // Load entities with their relations; restore relevance order afterwards.
    const orderedIds = idRows.map((r) => r.id);
    const unordered = await this.repository.find({
      where: { id: In(orderedIds) },
      relations: ['variants', 'bundleItems'],
    });
    const idPos = new Map(orderedIds.map((id, i) => [id, i]));
    unordered.sort((a, b) => (idPos.get(a.id) ?? 0) - (idPos.get(b.id) ?? 0));

    return { items: unordered, total };
  }

  async findAll(options?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: ProductOrmEntity[]; total: number }> {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 20;
    const offset = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (options?.status) where.status = options.status;

    const [items, total] = await this.repository.findAndCount({
      where,
      relations: ['variants', 'bundleItems'],
      order: { createdAt: 'DESC' },
      skip: offset,
      take: limit,
    });
    return { items, total };
  }
}
