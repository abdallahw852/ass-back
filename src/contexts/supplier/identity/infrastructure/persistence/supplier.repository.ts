import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ISupplierRepository,
  SupplierListingFilters,
} from '../../domain/repositories/supplier.repository.interface';
import { SupplierOrmEntity } from './supplier.orm-entity';
import { applyTrigramSearch } from '../../../../../shared/infrastructure/persistence/trigram-search';

@Injectable()
export class SupplierRepository implements ISupplierRepository {
  constructor(
    @InjectRepository(SupplierOrmEntity, 'write')
    private readonly repository: Repository<SupplierOrmEntity>,
  ) {}

  findByUserId(userId: number): Promise<SupplierOrmEntity | null> {
    return this.repository.findOne({ where: { userId }, relations: ['user'] });
  }

  findByRegistrationNumber(
    registrationNumber: string,
  ): Promise<SupplierOrmEntity | null> {
    return this.repository.findOne({ where: { registrationNumber } });
  }

  findByPublicId(publicId: string): Promise<SupplierOrmEntity | null> {
    return this.repository.findOne({
      where: { _id: publicId },
      relations: ['user'],
    });
  }

  async save(input: Partial<SupplierOrmEntity>): Promise<SupplierOrmEntity> {
    const entity = this.repository.create(input);
    const saved = await this.repository.save(entity);
    return this.repository.findOneOrFail({
      where: { id: saved.id },
      relations: ['user'],
    });
  }

  async findManyForListing(
    filters: SupplierListingFilters,
  ): Promise<{ rows: SupplierOrmEntity[]; total: number }> {
    const qb = this.repository
      .createQueryBuilder('s')
      .where('s.deletedAt IS NULL');

    if (filters.verifiedOnly) {
      qb.andWhere('s.isVerified = true');
    }

    if (filters.supplierTypes?.length) {
      qb.andWhere('s.supplierType IN (:...supplierTypes)', {
        supplierTypes: filters.supplierTypes,
      });
    }

    if (filters.countries?.length) {
      qb.andWhere('s.country IN (:...countries)', {
        countries: filters.countries,
      });
    }

    if (filters.status !== undefined) {
      qb.andWhere('s.verificationStatus = :status', { status: filters.status });
    }

    let relevanceExpr: string | null = null;
    if (filters.search) {
      relevanceExpr = applyTrigramSearch(qb, {
        term: filters.search,
        columns: [
          { expr: 's.companyName', weight: 3 },
          { expr: 's.companyNameEn', weight: 2 },
          { expr: 's.companyNameAr', weight: 2 },
        ],
      });
    }

    const sort = filters.sort ?? 'createdAt';
    const sortCol =
      sort === 'createdAt'
        ? 's.createdAt'
        : sort === 'companyName'
          ? 's.companyName'
          : 's.yearEstablished';

    // Prepend relevance ranking when a search term is present.
    if (relevanceExpr) {
      qb.orderBy(relevanceExpr, 'DESC')
        .addOrderBy('s.isVerified', 'DESC')
        .addOrderBy(sortCol, 'DESC');
    } else {
      qb.orderBy('s.isVerified', 'DESC').addOrderBy(sortCol, 'DESC');
    }

    const offset = (filters.page - 1) * filters.limit;
    qb.skip(offset).take(filters.limit);

    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }
}
