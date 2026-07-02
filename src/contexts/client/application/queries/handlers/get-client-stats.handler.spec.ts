import type { IClientReadRepository } from '../../../domain/client-read.repository.interface';
import type {
  ClientReadModel,
  ManualClientReadModel,
} from '../../../domain/client.read-model';
import { ClientNotFoundException } from '../../../domain/client.exceptions';
import { GetClientStatsQuery } from '../get-client-stats.query';
import { GetClientStatsHandler } from './get-client-stats.handler';

const makeClient = (): ClientReadModel => ({
  buyerPublicId: 'uuid-1',
  buyerInternalId: 42,
  name: 'Test',
  email: 'test@test.com',
  company: null,
  avatar: null,
  country: 'SA',
  role: 'buyer',
  joinedAt: new Date(),
  firstOrderAt: new Date(),
  lastOrderAt: new Date(),
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
  getClientStats(_supplierId: number, _buyerInternalId: number) {
    return Promise.resolve({ totalOrders: 5, lifetimeValueSar: 50_000 });
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

describe('GetClientStatsHandler', () => {
  it('throws ClientNotFoundException when buyer is not in supplier customer set', async () => {
    const repo = new FakeRepo();
    repo.seed(null);
    const handler = new GetClientStatsHandler(repo as never);

    await expect(
      handler.execute(new GetClientStatsQuery(1, 'bad-uuid')),
    ).rejects.toThrow(ClientNotFoundException);
  });

  it('returns totalOrders, lifetimeValueSar, creditLimitSar and null responseRate', async () => {
    const repo = new FakeRepo();
    repo.seed(makeClient());
    const handler = new GetClientStatsHandler(repo as never);

    const result = await handler.execute(new GetClientStatsQuery(1, 'uuid-1'));

    expect(result.totalOrders).toBe(5);
    expect(result.lifetimeValueSar).toBe(50_000);
    expect(result.creditLimitSar).toBe(100_000);
    expect(result.responseRate).toBeNull();
  });
});
