import { Inject, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetSupplierQuery } from '../get-supplier.query';
import { SUPPLIER_REPOSITORY } from '../../../domain/repositories/supplier.repository.interface';
import type { ISupplierRepository } from '../../../domain/repositories/supplier.repository.interface';
import { SUPPLIER_DOCUMENT_REPOSITORY } from '../../../domain/repositories/supplier-document.repository.interface';
import type { ISupplierDocumentRepository } from '../../../domain/repositories/supplier-document.repository.interface';

@QueryHandler(GetSupplierQuery)
export class GetSupplierHandler implements IQueryHandler<
  GetSupplierQuery,
  unknown
> {
  constructor(
    @Inject(SUPPLIER_REPOSITORY)
    private readonly supplierRepository: ISupplierRepository,
    @Inject(SUPPLIER_DOCUMENT_REPOSITORY)
    private readonly documentRepository: ISupplierDocumentRepository,
  ) {}

  async execute(query: GetSupplierQuery): Promise<unknown> {
    const supplier = await this.supplierRepository.findByPublicId(
      query.supplierPublicId,
    );
    if (!supplier) throw new NotFoundException('Supplier not found.');
    const documents = await this.documentRepository.findBySupplierId(
      supplier.id,
    );
    const { user: supplierUser, ...supplierData } = supplier;
    return {
      supplier: {
        ...supplierData,
        userId: supplierUser?._id ?? supplier.userId,
      },
      documents,
    };
  }
}
