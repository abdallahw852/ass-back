import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ManualClient } from '../../domain/manual-client.entity';
import type { IManualClientRepository } from '../../domain/manual-client.repository.interface';
import { ManualClientOrmEntity } from '../persistence/manual-client.orm-entity';
import { ManualClientMapper } from '../mappers/manual-client.mapper';

@Injectable()
export class ManualClientRepository implements IManualClientRepository {
  constructor(
    @InjectRepository(ManualClientOrmEntity, 'write')
    private readonly repo: Repository<ManualClientOrmEntity>,
  ) {}

  async save(client: ManualClient): Promise<ManualClient> {
    const orm = ManualClientMapper.toOrm(client);
    const saved = await this.repo.save(orm);
    return ManualClientMapper.toDomain(saved);
  }

  async existsBySupplierAndEmail(
    supplierId: number,
    email: string,
  ): Promise<boolean> {
    const count = await this.repo.count({ where: { supplierId, email } });
    return count > 0;
  }
}
