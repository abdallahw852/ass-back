import { SupplierOrmEntity } from '../../infrastructure/persistence/supplier.orm-entity';
import { SupplierType } from '../enums/supplier-type.enum';
import { SupplierVerificationStatus } from '../enums/supplier-verification-status.enum';

export interface SupplierListingFilters {
  search?: string;
  supplierTypes?: SupplierType[];
  countries?: string[];
  verifiedOnly?: boolean;
  status?: SupplierVerificationStatus;
  page: number;
  limit: number;
  sort?: 'createdAt' | 'companyName' | 'yearEstablished';
}

export interface ISupplierRepository {
  findByUserId(userId: number): Promise<SupplierOrmEntity | null>;
  findByRegistrationNumber(
    registrationNumber: string,
  ): Promise<SupplierOrmEntity | null>;
  findByPublicId(publicId: string): Promise<SupplierOrmEntity | null>;
  save(input: Partial<SupplierOrmEntity>): Promise<SupplierOrmEntity>;
  findManyForListing(
    filters: SupplierListingFilters,
  ): Promise<{ rows: SupplierOrmEntity[]; total: number }>;
}

export const SUPPLIER_REPOSITORY = Symbol('SUPPLIER_REPOSITORY');
