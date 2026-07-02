import { GetReturnRequestQuery } from './get-return-request.query';
import { GetReturnRequestHandler } from './get-return-request.handler';
import { ReturnRequestNotFoundException } from '../../domain/returns.exceptions';

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
  constructor(private readonly row: RawRow | undefined) {}

  createQueryBuilder = jest.fn(() => {
    const qb: Record<string, unknown> = {};
    const chain = () => qb;
    qb.leftJoin = chain;
    qb.select = chain;
    qb.addSelect = chain;
    qb.where = chain;
    qb.andWhere = chain;
    qb.getRawOne = jest.fn(() => Promise.resolve(this.row));
    return qb;
  });
}

describe('GetReturnRequestHandler', () => {
  it('throws ReturnRequestNotFoundException when no matching row is found', async () => {
    const repo = new FakeReturnRequestRepo(undefined);
    const handler = new GetReturnRequestHandler(repo as never);

    await expect(
      handler.execute(new GetReturnRequestQuery('missing-id', 1)),
    ).rejects.toThrow(ReturnRequestNotFoundException);
  });

  it('returns the mapped return request read model', async () => {
    const repo = new FakeReturnRequestRepo({
      r_id: 'return-1',
      r_status: 'approved',
      r_total_amount: '100.00',
      r_refund_amount: null,
      r_items_count: 2,
      r_reason: 'Damaged',
      r_created_at: new Date('2026-01-01T00:00:00Z'),
      order_public_id: 'order-1',
      buyer_name: 'John Buyer',
    });
    const handler = new GetReturnRequestHandler(repo as never);

    const result = await handler.execute(
      new GetReturnRequestQuery('return-1', 1),
    );

    expect(result).toEqual({
      id: 'return-1',
      orderId: 'order-1',
      customerName: 'John Buyer',
      date: new Date('2026-01-01T00:00:00Z'),
      status: 'approved',
      totalAmount: 100,
      items: 2,
      reason: 'Damaged',
    });
  });
});
