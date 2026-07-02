import type { IClientReadRepository } from '../../../domain/client-read.repository.interface';
import type {
  ClientReadModel,
  ManualClientReadModel,
} from '../../../domain/client.read-model';
import { ClientNotFoundException } from '../../../domain/client.exceptions';
import { GetClientQuotationsQuery } from '../get-client-quotations.query';
import { GetClientQuotationsHandler } from './get-client-quotations.handler';

const makeClient = (): ClientReadModel => ({
  buyerPublicId: 'uuid-1',
  buyerInternalId: 9,
  name: 'Test',
  email: 'test@test.com',
  company: null,
  avatar: null,
  country: null,
  role: 'buyer',
  joinedAt: new Date(),
  firstOrderAt: new Date(),
  lastOrderAt: new Date(),
  ordersCount: 1,
  lifetimeValueSar: 1_000,
});

class FakeRepo implements IClientReadRepository {
  private _client: ClientReadModel | null = null;

  seed(c: ClientReadModel | null) {
    this._client = c;
  }

  getClientHeader(): Promise<ClientReadModel | null> {
    return Promise.resolve(this._client);
  }
  getClientQuotations(): Promise<{ items: unknown[]; total: number }> {
    return Promise.resolve({ items: [{ id: 'q-1' }], total: 1 });
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
  listManualClients(): Promise<{
    items: ManualClientReadModel[];
    total: number;
  }> {
    return Promise.resolve({ items: [], total: 0 });
  }
}

describe('GetClientQuotationsHandler', () => {
  it('throws ClientNotFoundException when buyer absent', async () => {
    const repo = new FakeRepo();
    repo.seed(null);
    const handler = new GetClientQuotationsHandler(repo as never);

    await expect(
      handler.execute(new GetClientQuotationsQuery(1, 'bad', 1, 20)),
    ).rejects.toThrow(ClientNotFoundException);
  });

  it('returns quotations with pagination shape', async () => {
    const repo = new FakeRepo();
    repo.seed(makeClient());
    const handler = new GetClientQuotationsHandler(repo as never);

    const result = await handler.execute(
      new GetClientQuotationsQuery(1, 'uuid-1', 1, 20),
    );

    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });
});
