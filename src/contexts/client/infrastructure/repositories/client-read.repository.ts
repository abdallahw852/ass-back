import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { applyTrigramSearch } from '../../../../shared/infrastructure/persistence/trigram-search';
import { TradeOrderOrmEntity } from '../../../order/infrastructure/persistence/trade-order.orm-entity';
import { UserOrmEntity } from '../../../auth/infrastructure/persistence/user.orm-entity';
import { QuotationOrmEntity } from '../../../rfq/infrastructure/persistence/quotation.orm-entity';
import { RfqOrmEntity } from '../../../rfq/infrastructure/persistence/rfq.orm-entity';
import { ManualClientOrmEntity } from '../persistence/manual-client.orm-entity';
import type {
  IClientReadRepository,
  ClientListFilters,
} from '../../domain/client-read.repository.interface';
import type {
  ClientReadModel,
  ClientStats,
  ClientSummary,
  ManualClientReadModel,
} from '../../domain/client.read-model';
import { dateAddedWindowToDate } from '../../domain/enums/date-added-window.enum';

const ACTIVE_WINDOW_DAYS = 60;
const VIP_THRESHOLD = 250_000;
const PERMANENT_THRESHOLD = 5;

@Injectable()
export class ClientReadRepository implements IClientReadRepository {
  constructor(
    @InjectRepository(TradeOrderOrmEntity, 'write')
    private readonly orderRepo: Repository<TradeOrderOrmEntity>,
    @InjectRepository(UserOrmEntity, 'write')
    private readonly userRepo: Repository<UserOrmEntity>,
    @InjectRepository(QuotationOrmEntity, 'write')
    private readonly quotationRepo: Repository<QuotationOrmEntity>,
    @InjectRepository(RfqOrmEntity, 'write')
    private readonly rfqRepo: Repository<RfqOrmEntity>,
    @InjectRepository(ManualClientOrmEntity, 'write')
    private readonly manualClientRepo: Repository<ManualClientOrmEntity>,
  ) {}

  async listSupplierClients(
    supplierId: number,
    filters: ClientListFilters,
  ): Promise<{ items: ClientReadModel[]; total: number }> {
    const { page, limit } = filters;
    const skip = (page - 1) * limit;

    const qb = this.buildBaseGroupQuery(supplierId);
    const relevanceExpr = this.applyFilters(qb, filters);

    const countQb = this.buildBaseGroupQuery(supplierId);
    this.applyFilters(countQb, filters);
    const countResult = await countQb.getRawMany<{
      buyer_internal_id: string;
    }>();
    const total = countResult.length;

    // Rank by text relevance first when a search term is present; verified
    // suppliers already have isVerified handled at the WHERE layer (the query
    // groups by u.id PK so u.name / u.email are functionally determined and
    // can appear in ORDER BY without being in GROUP BY).
    if (relevanceExpr) {
      qb.orderBy(relevanceExpr, 'DESC').addOrderBy('MAX(o.created_at)', 'DESC');
    } else {
      qb.orderBy('MAX(o.created_at)', 'DESC');
    }

    const rows = await qb.limit(limit).offset(skip).getRawMany<RawClientRow>();

    const items = rows.map(mapRow);
    return { items, total };
  }

  async getSummary(
    supplierId: number,
    filters: Omit<ClientListFilters, 'page' | 'limit'>,
  ): Promise<ClientSummary> {
    const qb = this.buildBaseGroupQuery(supplierId);
    this.applyFilters(qb, { ...filters, page: 1, limit: 999999 });

    const rows = await qb.getRawMany<{
      buyer_internal_id: string;
      buyer_role: string;
      lifetime_value_sar: string;
      orders_count: string;
    }>();

    let totalLifetimeValueSar = 0;
    let vipAndAgentCount = 0;
    let totalOrders = 0;

    for (const row of rows) {
      const lv = parseFloat(row.lifetime_value_sar ?? '0');
      const cnt = parseInt(row.orders_count ?? '0', 10);
      totalLifetimeValueSar += lv;
      totalOrders += cnt;
      if (row.buyer_role === 'agent' || lv >= VIP_THRESHOLD) {
        vipAndAgentCount++;
      }
    }

    return {
      totalClients: rows.length,
      totalLifetimeValueSar,
      vipAndAgentCount,
      totalOrders,
    };
  }

  async getClientHeader(
    supplierId: number,
    buyerPublicId: string,
  ): Promise<ClientReadModel | null> {
    const user = await this.userRepo
      .createQueryBuilder('u')
      .where('u._id = :buyerPublicId', { buyerPublicId })
      .andWhere(
        `EXISTS (
          SELECT 1 FROM trade_orders o
          WHERE o.buyer_id = u.id
            AND o.supplier_id = :supplierId
            AND o.status IN ('paid','fulfilled')
        )`,
        { supplierId },
      )
      .getOne();

    if (!user) return null;

    const stats = await this.getClientStats(supplierId, user.id);
    const agg = await this.orderRepo
      .createQueryBuilder('o')
      .select('MIN(o.created_at)', 'firstOrderAt')
      .addSelect('MAX(o.created_at)', 'lastOrderAt')
      .where('o.supplier_id = :supplierId', { supplierId })
      .andWhere('o.buyer_id = :buyerId', { buyerId: user.id })
      .andWhere("o.status IN ('paid','fulfilled')")
      .getRawOne<{ firstOrderAt: Date; lastOrderAt: Date }>();

    return {
      buyerPublicId: user._id,
      buyerInternalId: user.id,
      name: user.name,
      email: user.email,
      company: null,
      avatar: user.avatar,
      country: user.country ?? null,
      role: user.role,
      joinedAt: user.createdAt,
      firstOrderAt: agg?.firstOrderAt ?? new Date(),
      lastOrderAt: agg?.lastOrderAt ?? new Date(),
      ordersCount: stats.totalOrders,
      lifetimeValueSar: stats.lifetimeValueSar,
    };
  }

  async getClientStats(
    supplierId: number,
    buyerInternalId: number,
  ): Promise<ClientStats> {
    const row = await this.orderRepo
      .createQueryBuilder('o')
      .select('COUNT(o.id)::int', 'totalOrders')
      .addSelect('COALESCE(SUM(o.subtotal), 0)::numeric', 'lifetimeValueSar')
      .where('o.supplier_id = :supplierId', { supplierId })
      .andWhere('o.buyer_id = :buyerInternalId', { buyerInternalId })
      .andWhere("o.status IN ('paid','fulfilled')")
      .getRawOne<{ totalOrders: number; lifetimeValueSar: string }>();

    return {
      totalOrders: row?.totalOrders ?? 0,
      lifetimeValueSar: parseFloat(String(row?.lifetimeValueSar ?? '0')),
    };
  }

  async getClientOrders(
    supplierId: number,
    buyerInternalId: number,
    page: number,
    limit: number,
  ): Promise<{ items: unknown[]; total: number }> {
    const [items, total] = await this.orderRepo.findAndCount({
      where: { supplier_id: supplierId, buyer_id: buyerInternalId },
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total };
  }

  async getClientQuotations(
    supplierId: number,
    buyerInternalId: number,
    page: number,
    limit: number,
  ): Promise<{ items: unknown[]; total: number }> {
    const [items, total] = await this.quotationRepo
      .createQueryBuilder('q')
      .innerJoin('q.rfq', 'rfq')
      .where('q.supplierId = :supplierId', { supplierId })
      .andWhere('rfq.buyerId = :buyerId', { buyerId: buyerInternalId })
      .orderBy('q.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { items, total };
  }

  async listManualClients(
    supplierId: number,
    filters: Omit<ClientListFilters, 'page' | 'limit'>,
  ): Promise<{ items: ManualClientReadModel[]; total: number }> {
    // Manual leads have no orders, so they can never be "active".
    if (filters.status === 'active') {
      return { items: [], total: 0 };
    }

    const qb = this.manualClientRepo
      .createQueryBuilder('m')
      .where('m.supplierId = :supplierId', { supplierId });

    if (filters.search) {
      qb.andWhere(
        '(m.companyName ILIKE :search OR m.fullName ILIKE :search OR m.email ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    if (filters.country) {
      qb.andWhere('m.country = :country', { country: filters.country });
    }

    if (filters.classification && filters.classification !== 'all') {
      qb.andWhere('m.classification = :classification', {
        classification: filters.classification,
      });
    }

    if (filters.dateAdded && filters.dateAdded !== 'all') {
      const since = dateAddedWindowToDate(filters.dateAdded, new Date());
      if (since) {
        qb.andWhere('m.createdAt >= :since', { since });
      }
    }

    qb.orderBy('m.createdAt', 'DESC');

    const [rows, total] = await qb.getManyAndCount();
    return { items: rows.map(mapManualClientRow), total };
  }

  // ── Private helpers ───────────────────────────────────────────

  private buildBaseGroupQuery(supplierId: number) {
    return this.orderRepo
      .createQueryBuilder('o')
      .innerJoin(UserOrmEntity, 'u', 'u.id = o.buyer_id')
      .select('u.id', 'buyer_internal_id')
      .addSelect('u._id', 'buyer_public_id')
      .addSelect('u.name', 'buyer_name')
      .addSelect('u.email', 'buyer_email')
      .addSelect('u.avatar', 'buyer_avatar')
      .addSelect('u.country', 'buyer_country')
      .addSelect('u.role', 'buyer_role')
      .addSelect('u.createdAt', 'joined_at')
      .addSelect('COUNT(o.id)::int', 'orders_count')
      .addSelect('SUM(o.subtotal)::numeric', 'lifetime_value_sar')
      .addSelect('MAX(o.created_at)', 'last_order_at')
      .addSelect('MIN(o.created_at)', 'first_order_at')
      .where('o.supplier_id = :supplierId', { supplierId })
      .andWhere("o.status IN ('paid','fulfilled')")
      .groupBy('u.id');
  }

  private applyFilters(
    qb: ReturnType<typeof this.buildBaseGroupQuery>,
    filters: Partial<ClientListFilters>,
  ): string | null {
    let relevanceExpr: string | null = null;
    if (filters.search) {
      // Trigram-aware matching: handles typos, partial tokens, and substrings.
      // The query groups by u.id (PK), so u.name / u.email are functionally
      // determined and are safe to use in WHERE without appearing in GROUP BY.
      // TODO(phase-2): add company search when buyer-profiles table exists
      relevanceExpr = applyTrigramSearch(qb, {
        term: filters.search,
        columns: [
          { expr: 'u.name', weight: 2 },
          { expr: 'u.email', weight: 1 },
        ],
      });
    }

    if (filters.country) {
      qb.andWhere('u.country = :country', { country: filters.country });
    }

    if (filters.dateAdded && filters.dateAdded !== 'all') {
      const since = dateAddedWindowToDate(filters.dateAdded, new Date());
      if (since) {
        qb.andHaving('MIN(o.created_at) >= :since', { since });
      }
    }

    if (filters.status === 'active') {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - ACTIVE_WINDOW_DAYS);
      qb.andHaving('MAX(o.created_at) >= :cutoff', { cutoff });
    } else if (filters.status === 'inactive') {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - ACTIVE_WINDOW_DAYS);
      qb.andHaving('MAX(o.created_at) < :cutoff', { cutoff });
    }

    if (filters.classification && filters.classification !== 'all') {
      switch (filters.classification) {
        case 'AUTHORIZED_AGENT':
          qb.andHaving("u.role = 'agent'");
          break;
        case 'VIP':
          qb.andHaving(`SUM(o.subtotal) >= ${VIP_THRESHOLD}`);
          break;
        case 'PERMANENT':
          qb.andHaving(
            `COUNT(o.id) >= ${PERMANENT_THRESHOLD} AND SUM(o.subtotal) < ${VIP_THRESHOLD}`,
          );
          break;
        case 'NEW':
          qb.andHaving(
            `COUNT(o.id) < ${PERMANENT_THRESHOLD} AND SUM(o.subtotal) < ${VIP_THRESHOLD} AND u.role != 'agent'`,
          );
          break;
      }
    }

    return relevanceExpr;
  }
}

// ── Row types ─────────────────────────────────────────────────

interface RawClientRow {
  buyer_internal_id: number;
  buyer_public_id: string;
  buyer_name: string | null;
  buyer_email: string;
  buyer_avatar: string | null;
  buyer_country: string | null;
  buyer_role: string;
  joined_at: Date;
  orders_count: number;
  lifetime_value_sar: string;
  last_order_at: Date;
  first_order_at: Date;
}

function mapRow(row: RawClientRow): ClientReadModel {
  return {
    buyerPublicId: row.buyer_public_id,
    buyerInternalId: Number(row.buyer_internal_id),
    name: row.buyer_name,
    email: row.buyer_email,
    company: null,
    avatar: row.buyer_avatar,
    country: row.buyer_country,
    role: row.buyer_role,
    joinedAt: new Date(row.joined_at),
    firstOrderAt: new Date(row.first_order_at),
    lastOrderAt: new Date(row.last_order_at),
    ordersCount: Number(row.orders_count),
    lifetimeValueSar: parseFloat(row.lifetime_value_sar ?? '0'),
  };
}

function mapManualClientRow(row: ManualClientOrmEntity): ManualClientReadModel {
  return {
    id: row._id,
    companyName: row.companyName,
    fullName: row.fullName,
    email: row.email,
    phone: row.phone,
    country: row.country,
    classification: row.classification,
    creditLimitSar:
      row.creditLimitSar !== null ? Number(row.creditLimitSar) : null,
    paymentTerms: row.paymentTerms,
    notes: row.notes,
    createdAt: row.createdAt,
  };
}
