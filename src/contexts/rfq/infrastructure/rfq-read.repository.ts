import { Injectable } from '@nestjs/common';
import { ReadModelRepositoryBase } from '../../../shared/infrastructure/persistence/read-model-repository.base';
import { applyTrigramSearch } from '../../../shared/infrastructure/persistence/trigram-search';
import type {
  AssignedRfqListOptions,
  BuyerRfqListOptions,
  IRfqReadRepository,
  MarketRfqListOptions,
  SupplierQuotationListOptions,
} from '../domain/rfq-read.repository.interface';
import { RfqStatus, RfqType } from '../domain/rfq.types';
import { QuotationReadModel } from './quotation.read-model';
import { RfqReadModel } from './rfq.read-model';
import { ConnectionService } from '../../../shared/infrastructure/persistence/connection.service';

@Injectable()
export class RfqReadRepository
  extends ReadModelRepositoryBase<RfqReadModel>
  implements IRfqReadRepository
{
  protected entity = RfqReadModel;

  constructor(connectionService: ConnectionService) {
    super(connectionService);
  }

  async listBuyerRfqs(
    options: BuyerRfqListOptions,
  ): Promise<{ items: Record<string, unknown>[]; total: number }> {
    const page = options.page ?? 1;
    const limit = options.limit ?? 20;

    const rfqRepo = this.getRepository();
    const qb = rfqRepo
      .createQueryBuilder('rfq')
      .where('rfq."buyerId" = :buyerId', { buyerId: options.buyerId });

    if (options.status && options.status !== 'all') {
      qb.andWhere('rfq.status = :status', { status: options.status });
    }

    const [rfqs, total] = await qb
      .orderBy('rfq."createdAt"', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    if (rfqs.length === 0) {
      return { items: [], total };
    }

    const rfqIds = rfqs.map((r) => r.id);
    const readConn = this.connectionService.getReadConnection();

    const attachments = await readConn
      .getRepository('rfq_attachments')
      .createQueryBuilder('a')
      .where('"rfqId" IN (:...rfqIds)', { rfqIds })
      .getRawMany<{ rfqId: number; count: string }>();

    const quotations = await readConn
      .getRepository('quotations')
      .createQueryBuilder('q')
      .select(['"rfqId"', 'COUNT(*) as count'])
      .where('"rfqId" IN (:...rfqIds)', { rfqIds })
      .groupBy('"rfqId"')
      .getRawMany<{ rfqId: number; count: string }>();

    const targetSupplierIds = rfqs
      .map((r) => r.targetSupplierId)
      .filter((id): id is number => id !== null);

    const supplierRows: { id: number; _id: string; companyName: string }[] =
      targetSupplierIds.length > 0
        ? await readConn.query(
            `SELECT id, _id, "companyName" FROM suppliers WHERE id = ANY($1::int[])`,
            [targetSupplierIds],
          )
        : [];

    const attachmentCountByRfqId = new Map<number, number>();
    for (const a of attachments) {
      const current = attachmentCountByRfqId.get(Number(a.rfqId)) ?? 0;
      attachmentCountByRfqId.set(Number(a.rfqId), current + 1);
    }

    const quotationCountByRfqId = new Map<number, number>();
    for (const q of quotations) {
      quotationCountByRfqId.set(Number(q.rfqId), Number(q.count));
    }

    const supplierById = new Map(supplierRows.map((s) => [s.id, s]));

    const items = rfqs.map((rfq) => {
      const supplier = rfq.targetSupplierId
        ? supplierById.get(rfq.targetSupplierId)
        : undefined;
      return {
        id: rfq._id,
        referenceNumber: rfq.referenceNumber,
        type: rfq.type,
        status: rfq.status,
        productName: rfq.productName,
        quantity: Number(rfq.quantity),
        quantityUnit: rfq.quantityUnit,
        message: rfq.message,
        requestedDeliveryDate: rfq.requestedDeliveryDate,
        targetSupplierId: supplier ? supplier['_id'] : null,
        targetSupplierName: supplier ? supplier['companyName'] : null,
        quotationCount: quotationCountByRfqId.get(rfq.id) ?? 0,
        attachmentCount: attachmentCountByRfqId.get(rfq.id) ?? 0,
        buyerViewedAt: rfq.buyerViewedAt,
        supplierViewedAt: rfq.supplierViewedAt,
        createdAt: rfq.createdAt,
        updatedAt: rfq.updatedAt,
      };
    });

    return { items, total };
  }

  async getRfqDetail(rfqId: string): Promise<Record<string, unknown> | null> {
    const rfqRepo = this.getRepository();
    const rfq = await rfqRepo
      .createQueryBuilder('rfq')
      .where('rfq._id = :rfqId', { rfqId })
      .getOne();

    if (!rfq) return null;

    const readConn = this.connectionService.getReadConnection();

    const [attachments, customizations, quotationRows] = await Promise.all([
      readConn
        .getRepository('rfq_attachments')
        .createQueryBuilder('a')
        .where('a."rfqId" = :rfqId', { rfqId: rfq.id })
        .getRawMany<{
          id: number;
          url: string;
          originalName: string;
          mimeType: string;
          size: number;
        }>(),
      readConn
        .getRepository('rfq_customizations')
        .createQueryBuilder('c')
        .where('c."rfqId" = :rfqId', { rfqId: rfq.id })
        .getRawMany<{ id: number; name: string; value: string }>(),
      readConn
        .getRepository('quotations')
        .createQueryBuilder('q')
        .where('q."rfqId" = :rfqId', { rfqId: rfq.id })
        .andWhere('q."status" != :cancelled', { cancelled: 'cancelled' })
        .orderBy('q."createdAt"', 'DESC')
        .getRawMany<Record<string, unknown>>(),
    ]);

    const supplierIds = [
      ...new Set(
        quotationRows
          .map((q) => q['q_supplierId'] as number)
          .filter((id): id is number => id != null),
      ),
    ];

    const supplierRows: { id: number; _id: string; companyName: string }[] =
      supplierIds.length > 0
        ? await readConn.query(
            `SELECT id, _id, "companyName" FROM suppliers WHERE id = ANY($1::int[])`,
            [supplierIds],
          )
        : [];

    const supplierById = new Map(supplierRows.map((s) => [s.id, s]));

    const productRow: {
      id: number;
      _id: string;
      name: string;
      supplierId: number;
    } | null = rfq.productId
      ? await readConn
          .query<
            { id: number; _id: string; name: string; supplierId: number }[]
          >(`SELECT id, _id, name, "supplierId" FROM products WHERE id = $1`, [rfq.productId])
          .then((rows) => rows[0] ?? null)
      : null;

    const targetSupplierRow: {
      id: number;
      _id: string;
      companyName: string;
      country: string | null;
    } | null = rfq.targetSupplierId
      ? await readConn
          .query<
            {
              id: number;
              _id: string;
              companyName: string;
              country: string | null;
            }[]
          >(
            `SELECT id, _id, "companyName", country FROM suppliers WHERE id = $1`,
            [rfq.targetSupplierId],
          )
          .then((rows) => rows[0] ?? null)
      : null;

    const quotationIds = quotationRows
      .map((q) => q['q_id'] as number)
      .filter((id): id is number => id != null);

    const quotationCustomizations =
      quotationIds.length > 0
        ? await readConn
            .getRepository('quotation_customizations')
            .createQueryBuilder('qc')
            .where('qc."quotationId" IN (:...quotationIds)', { quotationIds })
            .getRawMany<{
              qc_id: number;
              qc_quotationId: number;
              qc_name: string;
              qc_value: string;
            }>()
        : [];

    const customizationsByQuotationId = new Map<
      number,
      { id: number; name: string; value: string }[]
    >();
    for (const qc of quotationCustomizations) {
      const quotationId = qc.qc_quotationId;
      if (!customizationsByQuotationId.has(quotationId)) {
        customizationsByQuotationId.set(quotationId, []);
      }
      customizationsByQuotationId.get(quotationId)!.push({
        id: qc.qc_id,
        name: qc.qc_name,
        value: qc.qc_value,
      });
    }

    return {
      id: rfq._id,
      referenceNumber: rfq.referenceNumber,
      type: rfq.type,
      status: rfq.status,
      productName: rfq.productName,
      quantity: Number(rfq.quantity),
      quantityUnit: rfq.quantityUnit,
      message: rfq.message,
      technicalSpecs: rfq.technicalSpecs,
      sampleReadiness: rfq.sampleReadiness,
      requestedDeliveryDate: rfq.requestedDeliveryDate,
      buyerViewedAt: rfq.buyerViewedAt,
      supplierViewedAt: rfq.supplierViewedAt,
      product: productRow
        ? {
            id: productRow['_id'],
            name: productRow['name'],
            supplierId: productRow['supplierId'],
          }
        : null,
      targetSupplier: targetSupplierRow
        ? {
            id: targetSupplierRow['_id'],
            companyName: targetSupplierRow['companyName'],
            country: targetSupplierRow['country'],
          }
        : null,
      customizations: customizations.map((c) => ({
        id: c.id,
        name: c.name,
        value: c.value,
      })),
      attachments: attachments.map((a) => ({
        id: a.id,
        url: a.url,
        originalName: a.originalName,
        mimeType: a.mimeType,
        size: a.size,
      })),
      quotations: quotationRows.map((q) => {
        const supplierId = q['q_supplierId'] as number;
        const supplier = supplierById.get(supplierId);
        const quotationId = q['q_id'] as number;
        return {
          id: q['q__id'],
          supplierId: supplier ? supplier['_id'] : null,
          supplierName: supplier ? supplier['companyName'] : null,
          status: q['q_status'],
          productName: q['q_productName'],
          quantity: Number(q['q_quantity']),
          weightKg: q['q_weightKg'] === null ? null : Number(q['q_weightKg']),
          lengthCm: q['q_lengthCm'] === null ? null : Number(q['q_lengthCm']),
          widthCm: q['q_widthCm'] === null ? null : Number(q['q_widthCm']),
          heightCm: q['q_heightCm'] === null ? null : Number(q['q_heightCm']),
          unitPrice: Number(q['q_unitPrice']),
          totalPrice: Number(q['q_totalPrice']),
          currency: q['q_currency'],
          deliveryTimeDays: q['q_deliveryTimeDays'],
          paymentTerms: q['q_paymentTerms'],
          validUntil: q['q_validUntil'],
          shippingDetails: q['q_shippingDetails'],
          additionalNotes: q['q_additionalNotes'],
          buyerViewedAt: q['q_buyerViewedAt'],
          supplierViewedAt: q['q_supplierViewedAt'],
          createdAt: q['q_createdAt'],
          updatedAt: q['q_updatedAt'],
          customizations: customizationsByQuotationId.get(quotationId) ?? [],
        };
      }),
      createdAt: rfq.createdAt,
      updatedAt: rfq.updatedAt,
    };
  }

  async listMarketRfqs(
    options: MarketRfqListOptions,
  ): Promise<{ items: Record<string, unknown>[]; total: number }> {
    const page = options.page ?? 1;
    const limit = options.limit ?? 20;

    const rfqRepo = this.getRepository();
    const qb = rfqRepo
      .createQueryBuilder('rfq')
      .where('rfq.type = :type', { type: RfqType.GENERAL_CUSTOM })
      .andWhere('rfq.status = :status', { status: RfqStatus.OPEN });

    if (options.categoryId) {
      qb.andWhere('rfq."categoryId" = :categoryId', {
        categoryId: options.categoryId,
      });
    }

    let relevanceExpr: string | null = null;
    if (options.search) {
      relevanceExpr = applyTrigramSearch(qb, {
        term: options.search,
        columns: [
          { expr: 'rfq."productName"', weight: 2 },
          { expr: 'rfq.message', weight: 1 },
        ],
      });
    }

    if (options.country) {
      qb.andWhere(
        `rfq."buyerId" IN (SELECT id FROM users WHERE country = :country)`,
        { country: options.country },
      );
    }

    // Rank by text relevance when a search term is present; otherwise sort by newest.
    if (relevanceExpr) {
      qb.orderBy(relevanceExpr, 'DESC').addOrderBy('rfq."createdAt"', 'DESC');
    } else {
      qb.orderBy('rfq."createdAt"', 'DESC');
    }

    const [rfqs, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    if (rfqs.length === 0) {
      return { items: [], total };
    }

    const rfqIds = rfqs.map((r) => r.id);
    const readConn = this.connectionService.getReadConnection();

    const [attachmentCounts, quotationCounts] = await Promise.all([
      readConn
        .getRepository('rfq_attachments')
        .createQueryBuilder('a')
        .select(['"rfqId"', 'COUNT(*) as count'])
        .where('"rfqId" IN (:...rfqIds)', { rfqIds })
        .groupBy('"rfqId"')
        .getRawMany<{ rfqId: number; count: string }>(),
      readConn
        .getRepository('quotations')
        .createQueryBuilder('q')
        .select(['"rfqId"', 'COUNT(*) as count'])
        .where('"rfqId" IN (:...rfqIds)', { rfqIds })
        .andWhere('q."status" != :cancelled', { cancelled: 'cancelled' })
        .groupBy('"rfqId"')
        .getRawMany<{ rfqId: number; count: string }>(),
    ]);

    const attachmentCountByRfqId = new Map<number, number>();
    for (const a of attachmentCounts) {
      attachmentCountByRfqId.set(Number(a.rfqId), Number(a.count));
    }

    const quotationCountByRfqId = new Map<number, number>();
    for (const q of quotationCounts) {
      quotationCountByRfqId.set(Number(q.rfqId), Number(q.count));
    }

    const items = rfqs.map((rfq) => ({
      id: rfq._id,
      referenceNumber: rfq.referenceNumber,
      type: rfq.type,
      status: rfq.status,
      productName: rfq.productName,
      quantity: Number(rfq.quantity),
      quantityUnit: rfq.quantityUnit,
      message: rfq.message,
      requestedDeliveryDate: rfq.requestedDeliveryDate,
      targetSupplierId: null,
      targetSupplierName: null,
      quotationCount: quotationCountByRfqId.get(rfq.id) ?? 0,
      attachmentCount: attachmentCountByRfqId.get(rfq.id) ?? 0,
      buyerViewedAt: rfq.buyerViewedAt,
      supplierViewedAt: rfq.supplierViewedAt,
      createdAt: rfq.createdAt,
      updatedAt: rfq.updatedAt,
    }));

    return { items, total };
  }

  async listAssignedRfqs(
    options: AssignedRfqListOptions,
  ): Promise<{ items: Record<string, unknown>[]; total: number }> {
    const page = options.page ?? 1;
    const limit = options.limit ?? 20;

    const rfqRepo = this.getRepository();
    const [rfqs, total] = await rfqRepo
      .createQueryBuilder('rfq')
      .where('rfq.type = :type', { type: RfqType.PRODUCT_DIRECTED })
      .andWhere('rfq."targetSupplierId" = :supplierId', {
        supplierId: options.supplierId,
      })
      .orderBy('rfq."createdAt"', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    if (rfqs.length === 0) {
      return { items: [], total };
    }

    const rfqIds = rfqs.map((r) => r.id);
    const readConn = this.connectionService.getReadConnection();

    const [attachmentCounts, quotationCounts, productRows] = await Promise.all([
      readConn
        .getRepository('rfq_attachments')
        .createQueryBuilder('a')
        .select(['"rfqId"', 'COUNT(*) as count'])
        .where('"rfqId" IN (:...rfqIds)', { rfqIds })
        .groupBy('"rfqId"')
        .getRawMany<{ rfqId: number; count: string }>(),
      readConn
        .getRepository('quotations')
        .createQueryBuilder('q')
        .select(['"rfqId"', 'COUNT(*) as count'])
        .where('"rfqId" IN (:...rfqIds)', { rfqIds })
        .andWhere('q."status" != :cancelled', { cancelled: 'cancelled' })
        .groupBy('"rfqId"')
        .getRawMany<{ rfqId: number; count: string }>(),
      (async () => {
        const productIds = rfqs
          .map((r) => r.productId)
          .filter((id): id is number => id !== null);
        if (productIds.length === 0)
          return [] as { id: number; _id: string; name: string }[];
        return readConn.query<{ id: number; _id: string; name: string }[]>(
          `SELECT id, _id, name FROM products WHERE id = ANY($1::int[])`,
          [productIds],
        );
      })(),
    ]);

    const attachmentCountByRfqId = new Map<number, number>();
    for (const a of attachmentCounts) {
      attachmentCountByRfqId.set(Number(a.rfqId), Number(a.count));
    }

    const quotationCountByRfqId = new Map<number, number>();
    for (const q of quotationCounts) {
      quotationCountByRfqId.set(Number(q.rfqId), Number(q.count));
    }

    const productById = new Map(productRows.map((p) => [p.id, p]));

    const items = rfqs.map((rfq) => {
      const product = rfq.productId
        ? productById.get(rfq.productId)
        : undefined;
      return {
        id: rfq._id,
        referenceNumber: rfq.referenceNumber,
        type: rfq.type,
        status: rfq.status,
        productName: rfq.productName,
        quantity: Number(rfq.quantity),
        quantityUnit: rfq.quantityUnit,
        message: rfq.message,
        requestedDeliveryDate: rfq.requestedDeliveryDate,
        targetSupplierId: null,
        targetSupplierName: null,
        productId: product ? product['_id'] : null,
        productDisplayName: product ? product['name'] : null,
        quotationCount: quotationCountByRfqId.get(rfq.id) ?? 0,
        attachmentCount: attachmentCountByRfqId.get(rfq.id) ?? 0,
        buyerViewedAt: rfq.buyerViewedAt,
        supplierViewedAt: rfq.supplierViewedAt,
        createdAt: rfq.createdAt,
        updatedAt: rfq.updatedAt,
      };
    });

    return { items, total };
  }

  async listSupplierQuotations(
    options: SupplierQuotationListOptions,
  ): Promise<{ items: Record<string, unknown>[]; total: number }> {
    const page = options.page ?? 1;
    const limit = options.limit ?? 20;

    const readConn = this.connectionService.getReadConnection();
    const quotationRepo = readConn.getRepository(QuotationReadModel);

    const qb = quotationRepo
      .createQueryBuilder('q')
      .where('q."supplierId" = :supplierId', {
        supplierId: options.supplierId,
      });

    if (options.status && options.status !== 'all') {
      qb.andWhere('q.status = :status', { status: options.status });
    }

    const [quotations, total] = await qb
      .orderBy('q."createdAt"', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    if (quotations.length === 0) {
      return { items: [], total };
    }

    const rfqIds = [...new Set(quotations.map((q) => q.rfqId))];
    const rfqRows = await this.getRepository()
      .createQueryBuilder('rfq')
      .select([
        'rfq.id AS id',
        'rfq._id AS "_id"',
        'rfq."referenceNumber" AS "referenceNumber"',
        'rfq.status AS status',
        'rfq.type AS type',
      ])
      .where('rfq.id IN (:...rfqIds)', { rfqIds })
      .getRawMany<{
        id: number;
        _id: string;
        referenceNumber: string | null;
        status: string;
        type: string;
      }>();

    const rfqById = new Map(rfqRows.map((r) => [r.id, r]));

    const items = quotations.map((q) => {
      const rfq = rfqById.get(q.rfqId);
      return {
        id: q._id,
        status: q.status,
        productName: q.productName,
        quantity: Number(q.quantity),
        unitPrice: Number(q.unitPrice),
        totalPrice: Number(q.totalPrice),
        currency: q.currency,
        deliveryTimeDays: q.deliveryTimeDays,
        paymentTerms: q.paymentTerms,
        validUntil: q.validUntil,
        shippingDetails: q.shippingDetails,
        additionalNotes: q.additionalNotes,
        buyerViewedAt: q.buyerViewedAt,
        supplierViewedAt: q.supplierViewedAt,
        createdAt: q.createdAt,
        updatedAt: q.updatedAt,
        rfq: rfq
          ? {
              id: rfq['_id'],
              referenceNumber: rfq['referenceNumber'],
              status: rfq['status'],
              type: rfq['type'],
            }
          : null,
      };
    });

    return { items, total };
  }
}
