import type { IClientReadRepository } from '../../../domain/client-read.repository.interface';
import type {
  ClientReadModel,
  ManualClientReadModel,
} from '../../../domain/client.read-model';
import { ClientNotFoundException } from '../../../domain/client.exceptions';
import { GetClientQuery } from '../get-client.query';
import { GetClientHandler } from './get-client.handler';

const makeClient = (): ClientReadModel => ({
  buyerPublicId: 'uuid-buyer-1',
  buyerInternalId: 1,
  name: 'Ahmed Al-Otaibi',
  email: 'ahmed@test.com',
  company: null,
  avatar: null,
  country: 'SA',
  role: 'buyer',
  joinedAt: new Date('2024-01-01'),
  firstOrderAt: new Date('2024-06-01'),
  lastOrderAt: new Date('2024-12-01'),
  ordersCount: 5,
  lifetimeValueSar: 50_000,
});

class FakeRepo implements IClientReadRepository {
  private _client: ClientReadModel | null = null;

  seed(c: ClientReadModel | null) {
    this._client = c;
  }

  getClientHeader(): Promise<ClientReadModel | null> {
    return Promise.resolve(this._client);
  }
  listSupplierClients(): Promise<{ items: ClientReadModel[]; total: number }> {
    return Promise.resolve({ items: [], total: 0 });
  }
  getSummary(): Promise<{
    totalClients: number;
    totalLifetimeValueSar: number;
    vipAndAgentCount: number;
    totalOrders: number;
  }> {
    return Promise.resolve({
      totalClients: 0,
      totalLifetimeValueSar: 0,
      vipAndAgentCount: 0,
      totalOrders: 0,
    });
  }
  getClientStats(): Promise<{ totalOrders: number; lifetimeValueSar: number }> {
    return Promise.resolve({ totalOrders: 0, lifetimeValueSar: 0 });
  }
  getClientOrders(): Promise<{ items: unknown[]; total: number }> {
    return Promise.resolve({ items: [], total: 0 });
  }
  getClientQuotations(): Promise<{ items: unknown[]; total: number }> {
    return Promise.resolve({ items: [], total: 0 });
  }
  listManualClients(): Promise<{
    items: ManualClientReadModel[];
    total: number;
  }> {
    return Promise.resolve({ items: [], total: 0 });
  }
}

describe('GetClientHandler', () => {
  it('throws ClientNotFoundException when client not found', async () => {
    const repo = new FakeRepo();
    repo.seed(null);
    const handler = new GetClientHandler(repo as never);

    await expect(
      handler.execute(new GetClientQuery(1, 'nonexistent-uuid')),
    ).rejects.toThrow(ClientNotFoundException);
  });

  it('returns formatted client header when client exists', async () => {
    const repo = new FakeRepo();
    repo.seed(makeClient());
    const handler = new GetClientHandler(repo as never);

    const result = await handler.execute(new GetClientQuery(1, 'uuid-buyer-1'));

    expect(result.id).toBe('uuid-buyer-1');
    expect(result.name).toBe('Ahmed Al-Otaibi');
    expect(result.email).toBe('ahmed@test.com');
    expect(result.company).toBeNull();
    expect(result.initialsAvatarSeed).toBe('A');
  });
});
