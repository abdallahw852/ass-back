import type { ClientListFilters } from '../../domain/client-read.repository.interface';

export class ListClientsQuery {
  constructor(
    public readonly supplierId: number,
    public readonly filters: ClientListFilters,
  ) {}
}
