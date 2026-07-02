export const RFQ_READ_REPOSITORY = Symbol('RFQ_READ_REPOSITORY');

export interface BuyerRfqListOptions {
  buyerId: number;
  status?: string;
  page?: number;
  limit?: number;
}

export interface MarketRfqListOptions {
  supplierId: number;
  search?: string;
  categoryId?: number;
  country?: string;
  page?: number;
  limit?: number;
}

export interface AssignedRfqListOptions {
  supplierId: number;
  page?: number;
  limit?: number;
}

export interface SupplierQuotationListOptions {
  supplierId: number;
  status?: string;
  page?: number;
  limit?: number;
}

export interface IRfqReadRepository {
  listBuyerRfqs(
    options: BuyerRfqListOptions,
  ): Promise<{ items: Record<string, unknown>[]; total: number }>;
  getRfqDetail(rfqId: string): Promise<Record<string, unknown> | null>;
  listMarketRfqs(
    options: MarketRfqListOptions,
  ): Promise<{ items: Record<string, unknown>[]; total: number }>;
  listAssignedRfqs(
    options: AssignedRfqListOptions,
  ): Promise<{ items: Record<string, unknown>[]; total: number }>;
  listSupplierQuotations(
    options: SupplierQuotationListOptions,
  ): Promise<{ items: Record<string, unknown>[]; total: number }>;
}
