import type {
  IClientReadRepository,
  ClientListFilters,
} from '../../../domain/client-read.repository.interface';
import type {
  ClientReadModel,
  ClientSummary,
  ManualClientReadModel,
} from '../../../domain/client.read-model';
import { ClientClassification } from '../../../domain/value-objects/client-classification.vo';
import { ClientActivityStatus } from '../../../domain/value-objects/client-activity-status.vo';
import { ListClientsQuery } from '../list-clients.query';
import { ListClientsHandler } from './list-clients.handler';

const recentDate = new Date(Date.now() - 1000 * 60 * 60 * 24 * 10); // 10 days ago

const makeClient = (
  overrides: Partial<ClientReadModel> = {},
): ClientReadModel => ({
  buyerPublicId: 'uuid-1',
  buyerInternalId: 1,
  name: 'Test Buyer',
  email: 'test@test.com',
  company: null,
  avatar: null,
  country: 'SA',
  role: 'buyer',
  joinedAt: new Date('2024-01-01'),
  firstOrderAt: new Date('2024-06-01'),
  lastOrderAt: recentDate,
  ordersCount: 3,
  lifetimeValueSar: 10_000,
  ...overrides,
});

const makeSummary = (): ClientSummary => ({
  totalClients: 1,
  totalLifetimeValueSar: 10_000,
  vipAndAgentCount: 0,
  totalOrders: 3,
});

class FakeClientReadRepo implements IClientReadRepository {
  private _clients: ClientReadModel[] = [];
  private _summary: ClientSummary = makeSummary();

  seed(clients: ClientReadModel[], summary?: ClientSummary) {
    this._clients = clients;
    if (summary) this._summary = summary;
  }

  listSupplierClients(
    _supplierId: number,
    _filters: ClientListFilters,
  ): Promise<{ items: ClientReadModel[]; total: number }> {
    return Promise.resolve({
      items: this._clients,
      total: this._clients.length,
    });
  }

  getSummary(): Promise<ClientSummary> {
    return Promise.resolve(this._summary);
  }

  getClientHeader(): Promise<ClientReadModel | null> {
    return Promise.resolve(this._clients[0] ?? null);
  }

  getClientStats(): Promise<{ totalOrders: number; lifetimeValueSar: number }> {
    return Promise.resolve({ totalOrders: 3, lifetimeValueSar: 10_000 });
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

describe('ListClientsHandler', () => {
  const makeHandler = () => {
    const repo = new FakeClientReadRepo();
    const handler = new ListClientsHandler(repo as never);
    return { repo, handler };
  };

  it('returns combined shape with items, total, page, limit, summary', async () => {
    const { repo, handler } = makeHandler();
    repo.seed([makeClient()]);

    const result = await handler.execute(
      new ListClientsQuery(1, { page: 1, limit: 20 }),
    );

    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(result.summary).toMatchObject({
      totalClients: 1,
      totalLifetimeValueSar: 10_000,
    });
  });

  it('defaults page=1 and limit=20 when not provided', async () => {
    const { repo, handler } = makeHandler();
    repo.seed([makeClient()]);

    const result = await handler.execute(
      new ListClientsQuery(1, {} as ClientListFilters),
    );

    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });

  it('enriches items with classification, activityStatus, and creditTerms', async () => {
    const { repo, handler } = makeHandler();
    repo.seed([makeClient({ lifetimeValueSar: 300_000, ordersCount: 10 })]);

    const result = await handler.execute(
      new ListClientsQuery(1, { page: 1, limit: 20 }),
    );

    expect(result.items[0].classification).toBe(ClientClassification.VIP);
    expect(result.items[0].activityStatus).toBe(ClientActivityStatus.ACTIVE);
    expect(result.items[0].creditTerms).toEqual({
      creditLimitSar: 100_000,
      paymentTerms: 'NET_30',
    });
  });

  it('computes averageOrderValueSar correctly', async () => {
    const { repo, handler } = makeHandler();
    repo.seed([makeClient({ lifetimeValueSar: 30_000, ordersCount: 3 })]);

    const result = await handler.execute(
      new ListClientsQuery(1, { page: 1, limit: 20 }),
    );

    expect(result.items[0].averageOrderValueSar).toBe(10_000);
  });

  it('sets averageOrderValueSar to 0 when ordersCount is 0', async () => {
    const { repo, handler } = makeHandler();
    repo.seed([makeClient({ lifetimeValueSar: 0, ordersCount: 0 })]);

    const result = await handler.execute(
      new ListClientsQuery(1, { page: 1, limit: 20 }),
    );

    expect(result.items[0].averageOrderValueSar).toBe(0);
  });
});
