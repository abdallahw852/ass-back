import { CountryCode } from './enums/country-code.enum';
import { DateAddedWindow } from './enums/date-added-window.enum';
import type {
  ClientReadModel,
  ClientStats,
  ClientSummary,
  ManualClientReadModel,
} from './client.read-model';

export interface ClientListFilters {
  search?: string;
  status?: 'all' | 'active' | 'inactive';
  classification?: 'all' | 'VIP' | 'PERMANENT' | 'NEW' | 'AUTHORIZED_AGENT';
  country?: CountryCode;
  dateAdded?: DateAddedWindow;
  page: number;
  limit: number;
}

export interface IClientReadRepository {
  listSupplierClients(
    supplierId: number,
    filters: ClientListFilters,
  ): Promise<{ items: ClientReadModel[]; total: number }>;

  getSummary(
    supplierId: number,
    filters: Omit<ClientListFilters, 'page' | 'limit'>,
  ): Promise<ClientSummary>;

  getClientHeader(
    supplierId: number,
    buyerPublicId: string,
  ): Promise<ClientReadModel | null>;

  getClientStats(
    supplierId: number,
    buyerInternalId: number,
  ): Promise<ClientStats>;

  getClientOrders(
    supplierId: number,
    buyerInternalId: number,
    page: number,
    limit: number,
  ): Promise<{ items: unknown[]; total: number }>;

  getClientQuotations(
    supplierId: number,
    buyerInternalId: number,
    page: number,
    limit: number,
  ): Promise<{ items: unknown[]; total: number }>;

  /** Manually-added contacts/leads matching the given filters (unpaginated). */
  listManualClients(
    supplierId: number,
    filters: Omit<ClientListFilters, 'page' | 'limit'>,
  ): Promise<{ items: ManualClientReadModel[]; total: number }>;
}

export const CLIENT_READ_REPOSITORY = Symbol('CLIENT_READ_REPOSITORY');
