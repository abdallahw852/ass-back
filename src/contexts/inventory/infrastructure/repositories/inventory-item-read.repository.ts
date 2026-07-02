import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InventoryItemOrmEntity } from '../persistence/inventory-item.orm-entity';
import { StockMovementOrmEntity } from '../persistence/stock-movement.orm-entity';
import type { InventoryStatusFilter } from '../../application/queries/list-inventory-items.query';
import type { StockMovementReason } from '../../domain/enums/stock-movement-reason.enum';
import { applyTrigramSearch } from '../../../../shared/infrastructure/persistence/trigram-search';

export interface InventoryListRow {
  _id: string;
  sku: string | null;
  onHand: number;
  minStockThreshold: number;
  lastMovementAt: Date | null;
  updatedAt: Date;
  productName: string;
  images: string[];
  categoryId: string | null;
  currency: string;
  unitPrice: number;
  status: 'available' | 'low' | 'out';
}

export interface InventoryDetailRow extends InventoryListRow {
  supplierId: number;
  productId: number;
  variantId: number | null;
  reservedQty: number;
  createdAt: Date;
}

export interface MovementRow {
  _id: string;
  delta: number;
  balanceAfter: number;
  reason: StockMovementReason;
  note: string | null;
  actorUserId: number;
  occurredAt: Date;
}

@Injectable()
export class InventoryItemReadRepository {
  constructor(
    @InjectRepository(InventoryItemOrmEntity, 'write')
    private readonly itemRepo: Repository<InventoryItemOrmEntity>,
    @InjectRepository(StockMovementOrmEntity, 'write')
    private readonly movementRepo: Repository<StockMovementOrmEntity>,
  ) {}

  async list(
    supplierId: number,
    status: InventoryStatusFilter,
    search: string | undefined,
    page: number,
    pageSize: number,
  ): Promise<{ data: InventoryListRow[]; total: number }> {
    const qb = this.itemRepo
      .createQueryBuilder('i')
      .innerJoin('products', 'p', 'p.id = i."productId"')
      .leftJoin(
        'product_variants',
        'v',
        'v.id = i."variantId" AND v."deletedAt" IS NULL',
      )
      .select([
        'i._id            AS "_id"',
        'i.sku            AS sku',
        'i."onHand"       AS "onHand"',
        'i."minStockThreshold" AS "minStockThreshold"',
        'i."lastMovementAt"    AS "lastMovementAt"',
        'i."updatedAt"    AS "updatedAt"',
        'p.name           AS "productName"',
        'p.images         AS images',
        'p."categoryId"   AS "categoryId"',
        'p.currency       AS currency',
        'COALESCE(v.price, p."costPrice") AS "unitPrice"',
        `CASE
          WHEN i."onHand" = 0                          THEN 'out'
          WHEN i."onHand" <= i."minStockThreshold"     THEN 'low'
          ELSE 'available'
        END AS status`,
      ])
      .where('i."supplierId" = :supplierId', { supplierId })
      .andWhere('(i."variantId" IS NULL OR v.id IS NOT NULL)');

    if (status === 'out') {
      qb.andWhere('i."onHand" = 0');
    } else if (status === 'low') {
      qb.andWhere('i."onHand" > 0 AND i."onHand" <= i."minStockThreshold"');
    } else if (status === 'available') {
      qb.andWhere('i."onHand" > i."minStockThreshold"');
    }

    let relevanceExpr: string | null = null;
    if (search) {
      relevanceExpr = applyTrigramSearch(qb, {
        term: search,
        columns: [
          { expr: 'p.name', weight: 2 },
          { expr: 'i.sku', weight: 1 },
        ],
      });
    }

    const total = await qb.getCount();
    // When searching: rank by text relevance first, then alphabetically.
    // Without a search term: keep the original alphabetical ordering.
    if (relevanceExpr) {
      qb.orderBy(relevanceExpr, 'DESC').addOrderBy('p.name', 'ASC');
    } else {
      qb.orderBy('p.name', 'ASC');
    }
    const rows = await qb
      .offset((page - 1) * pageSize)
      .limit(pageSize)
      .getRawMany<Record<string, unknown>>();

    return {
      data: rows.map((r) => this.castListRow(r)),
      total,
    };
  }

  async stats(supplierId: number): Promise<{
    total: number;
    available: number;
    low: number;
    out: number;
  }> {
    const row = await this.itemRepo
      .createQueryBuilder('i')
      .select('COUNT(*)', 'total')
      .addSelect(
        `COUNT(*) FILTER (WHERE i."onHand" > i."minStockThreshold")`,
        'available',
      )
      .addSelect(
        `COUNT(*) FILTER (WHERE i."onHand" > 0 AND i."onHand" <= i."minStockThreshold")`,
        'low',
      )
      .addSelect(`COUNT(*) FILTER (WHERE i."onHand" = 0)`, 'out')
      .where('i."supplierId" = :supplierId', { supplierId })
      .andWhere(
        '(i."variantId" IS NULL OR EXISTS (SELECT 1 FROM product_variants pv WHERE pv.id = i."variantId" AND pv."deletedAt" IS NULL))',
      )
      .getRawOne<Record<string, string>>();

    return {
      total: Number(row?.['total'] ?? 0),
      available: Number(row?.['available'] ?? 0),
      low: Number(row?.['low'] ?? 0),
      out: Number(row?.['out'] ?? 0),
    };
  }

  async findDetail(
    id: string,
    supplierId: number,
  ): Promise<InventoryDetailRow | null> {
    const rows = await this.itemRepo
      .createQueryBuilder('i')
      .innerJoin('products', 'p', 'p.id = i."productId"')
      .leftJoin(
        'product_variants',
        'v',
        'v.id = i."variantId" AND v."deletedAt" IS NULL',
      )
      .select([
        'i._id            AS "_id"',
        'i."supplierId"   AS "supplierId"',
        'i."productId"    AS "productId"',
        'i."variantId"    AS "variantId"',
        'i.sku            AS sku',
        'i."onHand"       AS "onHand"',
        'i."reservedQty"  AS "reservedQty"',
        'i."minStockThreshold" AS "minStockThreshold"',
        'i."lastMovementAt"    AS "lastMovementAt"',
        'i."createdAt"    AS "createdAt"',
        'i."updatedAt"    AS "updatedAt"',
        'p.name           AS "productName"',
        'p.images         AS images',
        'p."categoryId"   AS "categoryId"',
        'p.currency       AS currency',
        'COALESCE(v.price, p."costPrice") AS "unitPrice"',
        `CASE
          WHEN i."onHand" = 0                          THEN 'out'
          WHEN i."onHand" <= i."minStockThreshold"     THEN 'low'
          ELSE 'available'
        END AS status`,
      ])
      .where('i._id = :id AND i."supplierId" = :supplierId', { id, supplierId })
      .andWhere('(i."variantId" IS NULL OR v.id IS NOT NULL)')
      .getRawMany<Record<string, unknown>>();

    if (!rows.length) return null;
    const r = rows[0];
    return {
      ...this.castListRow(r),
      supplierId: Number(r['supplierId']),
      productId: Number(r['productId']),
      variantId: r['variantId'] != null ? Number(r['variantId']) : null,
      reservedQty: Number(r['reservedQty']),
      createdAt: r['createdAt'] as Date,
    };
  }

  async listMovements(
    inventoryItemId: string,
    supplierId: number,
    reason: StockMovementReason | undefined,
    from: Date | undefined,
    to: Date | undefined,
    page: number,
    pageSize: number,
  ): Promise<{ data: MovementRow[]; total: number }> {
    // Verify ownership via a join before returning movements
    const item = await this.itemRepo.findOne({
      where: { _id: inventoryItemId, supplierId },
      select: ['id'],
    });
    if (!item) return { data: [], total: 0 };

    const qb = this.movementRepo
      .createQueryBuilder('m')
      .where('m."inventoryItemId" = :id', { id: item.id })
      .orderBy('m."occurredAt"', 'DESC');

    if (reason) qb.andWhere('m.reason = :reason', { reason });
    if (from) qb.andWhere('m."occurredAt" >= :from', { from });
    if (to) qb.andWhere('m."occurredAt" <= :to', { to });

    const [rows, total] = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return {
      data: rows.map((r) => ({
        _id: r._id,
        delta: r.delta,
        balanceAfter: r.balanceAfter,
        reason: r.reason,
        note: r.note,
        actorUserId: r.actorUserId,
        occurredAt: r.occurredAt,
      })),
      total,
    };
  }

  private castListRow(r: Record<string, unknown>): InventoryListRow {
    return {
      _id: r['_id'] as string,
      sku: (r['sku'] as string | null) ?? null,
      onHand: Number(r['onHand']),
      minStockThreshold: Number(r['minStockThreshold']),
      lastMovementAt: (r['lastMovementAt'] as Date | null) ?? null,
      updatedAt: r['updatedAt'] as Date,
      productName: r['productName'] as string,
      images: r['images'] as string[],
      categoryId: (r['categoryId'] as string | null) ?? null,
      currency: r['currency'] as string,
      unitPrice: Number(r['unitPrice']),
      status: r['status'] as 'available' | 'low' | 'out',
    };
  }
}
