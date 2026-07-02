import type { IClientReadRepository } from '../../../domain/client-read.repository.interface';
import type {
  ClientReadModel,
  ManualClientReadModel,
} from '../../../domain/client.read-model';
import { ClientNotFoundException } from '../../../domain/client.exceptions';
import { GetClientOrdersQuery } from '../get-client-orders.query';
import { GetClientOrdersHandler } from './get-client-orders.handler';

const makeClient = (): ClientReadModel => ({
  buyerPublicId: 'uuid-1',
  buyerInternalId: 7,
  name: 'Test',
  email: 'test@test.com',
  company: null,
  avatar: null,
  country: null,
  role: 'buyer',
  joinedAt: new Date(),
  firstOrderAt: new Date(),
  lastOrderAt: new Date(),
  ordersCount: 2,
  lifetimeValueSar: 5_000,
});

class FakeRepo implements IClientReadRepository {
  private _client: ClientReadModel | null = null;
  private _orders: unknown[] = [];

  seed(c: ClientReadModel | null, orders: unknown[] = []) {
    this._client = c;
    this._orders = orders;
  }

  getClientHeader(): Promise<ClientReadModel | null> {
    return Promise.resolve(this._client);
  }
  getClientOrders(
    _s: number,
    _b: number,
    _page: number,
    _limit: number,
  ): Promise<{ items: unknown[]; total: number }> {
    return Promise.resolve({ items: this._orders, total: this._orders.length });
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

describe('GetClientOrdersHandler', () => {
  it('throws ClientNotFoundException when buyer absent', async () => {
    const repo = new FakeRepo();
    repo.seed(null);
    const handler = new GetClientOrdersHandler(repo as never);

    await expect(
      handler.execute(new GetClientOrdersQuery(1, 'bad-uuid', 1, 20)),
    ).rejects.toThrow(ClientNotFoundException);
  });

  it('returns orders with correct pagination shape', async () => {
    const repo = new FakeRepo();
    repo.seed(makeClient(), [{ id: 'order-1' }, { id: 'order-2' }]);
    const handler = new GetClientOrdersHandler(repo as never);

    const result = await handler.execute(
      new GetClientOrdersQuery(1, 'uuid-1', 2, 10),
    );

    expect(result.items).toHaveLength(2);
    expect(result.total).toBe(2);
    expect(result.page).toBe(2);
    expect(result.limit).toBe(10);
  });
});
