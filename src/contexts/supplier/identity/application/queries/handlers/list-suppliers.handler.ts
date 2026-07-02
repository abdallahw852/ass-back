import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ListSuppliersQuery } from '../list-suppliers.query';
import { SUPPLIER_REPOSITORY } from '../../../domain/repositories/supplier.repository.interface';
import type { ISupplierRepository } from '../../../domain/repositories/supplier.repository.interface';
import {
  GCC_COUNTRIES,
  GCC_NAME_ALIASES,
} from '../../../../../../shared/constants/regions';
import { SupplierOrmEntity } from '../../../infrastructure/persistence/supplier.orm-entity';

export interface SupplierListItem {
  id: string;
  companyName: string;
  companyNameAr: string | null;
  companyNameEn: string | null;
  country: string;
  city: string | null;
  supplierType: string | null;
  isVerified: boolean;
  yearEstablished: number | null;
  logoUrl: string | null;
}

export interface ListSuppliersResult {
  items: SupplierListItem[];
  total: number;
  page: number;
  limit: number;
}

@QueryHandler(ListSuppliersQuery)
export class ListSuppliersHandler implements IQueryHandler<
  ListSuppliersQuery,
  ListSuppliersResult
> {
  constructor(
    @Inject(SUPPLIER_REPOSITORY)
    private readonly supplierRepository: ISupplierRepository,
  ) {}

  async execute(query: ListSuppliersQuery): Promise<ListSuppliersResult> {
    const { filters } = query;
    const verifiedOnly = filters.verifiedOnly ?? true;

    let countries = filters.countries ? [...filters.countries] : undefined;

    if (filters.region === 'gulf') {
      const gccSet = new Set([...(countries ?? []), ...GCC_COUNTRIES]);
      // also add common name aliases so free-text values in DB also match
      Object.keys(GCC_NAME_ALIASES).forEach((name) => gccSet.add(name));
      countries = [...gccSet];
    }

    const { rows, total } = await this.supplierRepository.findManyForListing({
      search: filters.search,
      supplierTypes: filters.supplierTypes,
      countries,
      verifiedOnly,
      page: filters.page,
      limit: filters.limit,
      sort: filters.sort,
    });

    const items: SupplierListItem[] = rows.map(
      (s: SupplierOrmEntity): SupplierListItem => ({
        id: s._id,
        companyName: s.companyName,
        companyNameAr: s.companyNameAr,
        companyNameEn: s.companyNameEn,
        country: s.country,
        city: s.city,
        supplierType: s.supplierType,
        isVerified: s.isVerified,
        yearEstablished: s.yearEstablished,
        logoUrl: s.logoUrl,
      }),
    );

    return { items, total, page: filters.page, limit: filters.limit };
  }
}
