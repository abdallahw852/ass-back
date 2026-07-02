import { Inject, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetCurrentSupplierQuery } from '../get-current-supplier.query';
import { SUPPLIER_REPOSITORY } from '../../../domain/repositories/supplier.repository.interface';
import type { ISupplierRepository } from '../../../domain/repositories/supplier.repository.interface';
import type { SupplierOrmEntity } from '../../../infrastructure/persistence/supplier.orm-entity';

@QueryHandler(GetCurrentSupplierQuery)
export class GetCurrentSupplierHandler implements IQueryHandler<
  GetCurrentSupplierQuery,
  SupplierOrmEntity
> {
  constructor(
    @Inject(SUPPLIER_REPOSITORY)
    private readonly supplierRepository: ISupplierRepository,
  ) {}

  async execute(query: GetCurrentSupplierQuery): Promise<SupplierOrmEntity> {
    const supplier = await this.supplierRepository.findByUserId(query.userId);
    if (!supplier) throw new NotFoundException('Supplier profile not found.');
    return supplier;
  }
}
