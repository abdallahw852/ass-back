import type { QuotationCustomizationOrmEntity } from '../infrastructure/persistence/quotation-customization.orm-entity';
import type { QuotationOrmEntity } from '../infrastructure/persistence/quotation.orm-entity';

export const QUOTATION_REPOSITORY = Symbol('QUOTATION_REPOSITORY');

export type SaveQuotationInput = Partial<
  Omit<QuotationOrmEntity, 'customizations'>
> & {
  customizations?: Partial<QuotationCustomizationOrmEntity>[];
};

export interface IQuotationRepository {
  findByPublicId(publicId: string): Promise<QuotationOrmEntity | null>;
  findByPublicIdWithRelations(
    publicId: string,
  ): Promise<QuotationOrmEntity | null>;
  findByRfqAndSupplier(
    rfqId: number,
    supplierId: number,
  ): Promise<QuotationOrmEntity | null>;
  countSupplierQuotationsInPeriod(
    supplierId: number,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<number>;
  save(input: SaveQuotationInput): Promise<QuotationOrmEntity>;
  update(id: number, input: SaveQuotationInput): Promise<QuotationOrmEntity>;
  rejectOtherSubmitted(rfqId: number, acceptedId: number): Promise<void>;
}
