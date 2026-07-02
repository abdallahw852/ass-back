import { ListReturnRequestsQuery } from './list-return-requests.query';
import { ListReturnRequestsHandler } from './list-return-requests.handler';

interface RawRow {
  r_id: string;
  r_status: string;
  r_total_amount: string;
  r_refund_amount: string | null;
  r_items_count: number;
  r_reason: string;
  r_created_at: Date;
  order_public_id: string;
  buyer_name: string | null;
}

class FakeReturnRequestRepo {
  constructor(
    private readonly rows: RawRow[],
    private readonly total: number,
  ) {}

  createQueryBuilder = jest.fn(() => {
    const qb: Record<string, unknown> = {};
    qb.leftJoin = jest.fn(() => qb);
    qb.select = jest.fn(() => qb);
    qb.addSelect = jest.fn(() => qb);
    qb.where = jest.fn(() => qb);
    qb.andWhere = jest.fn(() => qb);
    qb.orderBy = jest.fn(() => qb);
    qb.limit = jest.fn(() => qb);
    qb.offset = jest.fn(() => qb);
    qb.getCount = jest.fn(() => Promise.resolve(this.total));
    qb.getRawMany = jest.fn(() => Promise.resolve(this.rows));
    return qb;
  });
}

describe('ListReturnRequestsHandler', () => {
  it('returns paginated, mapped return requests', async () => {
    const rows: RawRow[] = [
      {
        r_id: 'return-1',
        r_status: 'pending',
        r_total_amount: '100.00',
        r_refund_amount: null,
        r_items_count: 2,
        r_reason: 'Damaged',
        r_created_at: new Date('2026-01-01T00:00:00Z'),
        order_public_id: 'order-1',
        buyer_name: 'John Buyer',
      },
      {
        r_id: 'return-2',
        r_status: 'refunded',
        r_total_amount: '200.00',
        r_refund_amount: '150.00',
        r_items_count: 1,
        r_reason: 'Wrong item',
        r_created_at: new Date('2026-01-02T00:00:00Z'),
        order_public_id: 'order-2',
        buyer_name: 'Jane Buyer',
      },
    ];
    const repo = new FakeReturnRequestRepo(rows, 2);
    const handler = new ListReturnRequestsHandler(repo as never);

    const result = await handler.execute(
      new ListReturnRequestsQuery(1, undefined, 1, 20),
    );

    expect(result.total).toBe(2);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(result.items).toEqual([
      {
        id: 'return-1',
        orderId: 'order-1',
        customerName: 'John Buyer',
        date: new Date('2026-01-01T00:00:00Z'),
        status: 'pending',
        totalAmount: 100,
        items: 2,
        reason: 'Damaged',
      },
      {
        id: 'return-2',
        orderId: 'order-2',
        customerName: 'Jane Buyer',
        date: new Date('2026-01-02T00:00:00Z'),
        status: 'refunded',
        totalAmount: 150,
        items: 1,
        reason: 'Wrong item',
      },
    ]);
  });

  it('filters by status when provided', async () => {
    const repo = new FakeReturnRequestRepo([], 0);
    const handler = new ListReturnRequestsHandler(repo as never);

    const qb = repo.createQueryBuilder();
    repo.createQueryBuilder.mockReturnValueOnce(qb);

    await handler.execute(new ListReturnRequestsQuery(1, 'pending', 1, 20));

    expect((qb.andWhere as jest.Mock).mock.calls[0]).toEqual([
      'r.status = :status',
      { status: 'pending' },
    ]);
  });
});
