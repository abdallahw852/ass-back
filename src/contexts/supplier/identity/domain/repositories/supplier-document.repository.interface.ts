import { SupplierDocumentOrmEntity } from '../../infrastructure/persistence/supplier-document.orm-entity';

export interface ISupplierDocumentRepository {
  findBySupplierId(supplierId: number): Promise<SupplierDocumentOrmEntity[]>;
  save(
    input: Partial<SupplierDocumentOrmEntity>,
  ): Promise<SupplierDocumentOrmEntity>;
}

export const SUPPLIER_DOCUMENT_REPOSITORY = Symbol(
  'SUPPLIER_DOCUMENT_REPOSITORY',
);
