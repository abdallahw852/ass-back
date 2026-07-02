import type { IClientReadRepository } from '../../../domain/client-read.repository.interface';
import type {
  ClientReadModel,
  ManualClientReadModel,
} from '../../../domain/client.read-model';
import { ClientNotFoundException } from '../../../domain/client.exceptions';
import { GetClientSampleRequestsQuery } from '../get-client-sample-requests.query';
import { GetClientSampleRequestsHandler } from './get-client-sample-requests.handler';

const makeClient = (): ClientReadModel => ({
  buyerPublicId: 'uuid-1',
  buyerInternalId: 1,
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

describe('GetClientSampleRequestsHandler (stub)', () => {
  it('throws ClientNotFoundException when buyer absent', async () => {
    const repo = new FakeRepo();
    repo.seed(null);
    const handler = new GetClientSampleRequestsHandler(repo as never);

    await expect(
      handler.execute(new GetClientSampleRequestsQuery(1, 'bad')),
    ).rejects.toThrow(ClientNotFoundException);
  });

  it('returns empty stub payload when buyer exists', async () => {
    const repo = new FakeRepo();
    repo.seed(makeClient());
    const handler = new GetClientSampleRequestsHandler(repo as never);

    const result = await handler.execute(
      new GetClientSampleRequestsQuery(1, 'uuid-1'),
    );

    expect(result).toEqual({ items: [], total: 0, page: 1, limit: 20 });
  });
});
