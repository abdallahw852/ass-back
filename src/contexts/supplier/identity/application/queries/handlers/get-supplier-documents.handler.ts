import { Inject, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetSupplierDocumentsQuery } from '../get-supplier-documents.query';
import { SUPPLIER_REPOSITORY } from '../../../domain/repositories/supplier.repository.interface';
import type { ISupplierRepository } from '../../../domain/repositories/supplier.repository.interface';
import { SUPPLIER_DOCUMENT_REPOSITORY } from '../../../domain/repositories/supplier-document.repository.interface';
import type { ISupplierDocumentRepository } from '../../../domain/repositories/supplier-document.repository.interface';
import { SupplierDocumentOrmEntity } from '../../../infrastructure/persistence/supplier-document.orm-entity';

@QueryHandler(GetSupplierDocumentsQuery)
export class GetSupplierDocumentsHandler implements IQueryHandler<
  GetSupplierDocumentsQuery,
  SupplierDocumentOrmEntity[]
> {
  constructor(
    @Inject(SUPPLIER_REPOSITORY)
    private readonly supplierRepository: ISupplierRepository,
    @Inject(SUPPLIER_DOCUMENT_REPOSITORY)
    private readonly documentRepository: ISupplierDocumentRepository,
  ) {}

  async execute(
    query: GetSupplierDocumentsQuery,
  ): Promise<SupplierDocumentOrmEntity[]> {
    const supplier = await this.supplierRepository.findByUserId(query.userId);
    if (!supplier) throw new NotFoundException('Supplier profile not found.');
    return this.documentRepository.findBySupplierId(supplier.id);
  }
}
