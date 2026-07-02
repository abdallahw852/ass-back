import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ISupplierDocumentRepository } from '../../domain/repositories/supplier-document.repository.interface';
import { SupplierDocumentOrmEntity } from './supplier-document.orm-entity';

@Injectable()
export class SupplierDocumentRepository implements ISupplierDocumentRepository {
  constructor(
    @InjectRepository(SupplierDocumentOrmEntity, 'write')
    private readonly repository: Repository<SupplierDocumentOrmEntity>,
  ) {}

  findBySupplierId(supplierId: number): Promise<SupplierDocumentOrmEntity[]> {
    return this.repository.find({
      where: { supplierId },
      order: { createdAt: 'DESC' },
    });
  }

  save(
    input: Partial<SupplierDocumentOrmEntity>,
  ): Promise<SupplierDocumentOrmEntity> {
    const entity = this.repository.create(input);
    return this.repository.save(entity);
  }
}
