import { SupplierType } from '../../domain/enums/supplier-type.enum';

export class ListSuppliersQuery {
  constructor(
    public readonly filters: {
      search?: string;
      supplierTypes?: SupplierType[];
      countries?: string[];
      region?: 'gulf';
      verifiedOnly?: boolean;
      page: number;
      limit: number;
      sort?: 'createdAt' | 'companyName' | 'yearEstablished';
    },
  ) {}
}
