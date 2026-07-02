import type { ManualClient } from './manual-client.entity';

export interface IManualClientRepository {
  save(client: ManualClient): Promise<ManualClient>;

  existsBySupplierAndEmail(supplierId: number, email: string): Promise<boolean>;
}

export const MANUAL_CLIENT_REPOSITORY = Symbol('MANUAL_CLIENT_REPOSITORY');
