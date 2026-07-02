import { RefundReturnCommand } from './refund-return.command';
import { RefundReturnHandler } from './refund-return.handler';
import {
  InvalidReturnStatusTransitionException,
  ReturnRequestAccessDeniedException,
  ReturnRequestNotFoundException,
} from '../../domain/returns.exceptions';
import type { ReturnRequestOrmEntity } from '../../infrastructure/persistence/return-request.orm-entity';

function buildEntity(
  overrides: Partial<ReturnRequestOrmEntity> = {},
): ReturnRequestOrmEntity {
  return {
    id: 1,
    _id: 'return-public-id',
    order_id: 10,
    supplier_id: 1,
    buyer_id: 20,
    reason: 'Item damaged',
    status: 'approved',
    rejection_reason: null,
    total_amount: 100,
    items_count: 2,
    currency: 'SAR',
    refund_amount: null,
    reviewed_by_id: 99,
    reviewed_at: new Date('2026-01-02T00:00:00Z'),
    refunded_at: null,
    created_at: new Date('2026-01-01T00:00:00Z'),
    updated_at: new Date('2026-01-01T00:00:00Z'),
    setDefaults: jest.fn(),
    ...overrides,
  } as ReturnRequestOrmEntity;
}

class FakeReturnRequestRepo {
  constructor(private entity: ReturnRequestOrmEntity | null) {}

  findOne = jest.fn(() => Promise.resolve(this.entity));

  save = jest.fn((entity: ReturnRequestOrmEntity) => {
    this.entity = entity;
    return Promise.resolve(entity);
  });

  createQueryBuilder = jest.fn(() => {
    const qb: Record<string, unknown> = {};
    const chain = () => qb;
    qb.leftJoin = chain;
    qb.select = chain;
    qb.addSelect = chain;
    qb.where = chain;
    qb.andWhere = chain;
    qb.getRawOne = jest.fn(() => {
      if (!this.entity) return Promise.resolve(undefined);
      return Promise.resolve({
        r_id: this.entity._id,
        r_status: this.entity.status,
        r_total_amount: String(this.entity.total_amount),
        r_refund_amount:
          this.entity.refund_amount === null
            ? null
            : String(this.entity.refund_amount),
        r_items_count: this.entity.items_count,
        r_reason: this.entity.reason,
        r_created_at: this.entity.created_at,
        order_public_id: 'order-public-id',
        buyer_name: 'John Buyer',
      });
    });
    return qb;
  });
}

describe('RefundReturnHandler', () => {
  it('throws ReturnRequestNotFoundException when the return request does not exist', async () => {
    const repo = new FakeReturnRequestRepo(null);
    const handler = new RefundReturnHandler(repo as never);

    await expect(
      handler.execute(new RefundReturnCommand('missing-id', 1, 99)),
    ).rejects.toThrow(ReturnRequestNotFoundException);
  });

  it('throws ReturnRequestAccessDeniedException when the return belongs to another supplier', async () => {
    const repo = new FakeReturnRequestRepo(buildEntity({ supplier_id: 2 }));
    const handler = new RefundReturnHandler(repo as never);

    await expect(
      handler.execute(new RefundReturnCommand('return-public-id', 1, 99)),
    ).rejects.toThrow(ReturnRequestAccessDeniedException);
  });

  it('throws InvalidReturnStatusTransitionException when the return is not approved', async () => {
    const repo = new FakeReturnRequestRepo(buildEntity({ status: 'pending' }));
    const handler = new RefundReturnHandler(repo as never);

    await expect(
      handler.execute(new RefundReturnCommand('return-public-id', 1, 99)),
    ).rejects.toThrow(InvalidReturnStatusTransitionException);
  });

  it('refunds an approved return for the default total amount when no amount is given', async () => {
    const repo = new FakeReturnRequestRepo(buildEntity());
    const handler = new RefundReturnHandler(repo as never);

    const result = await handler.execute(
      new RefundReturnCommand('return-public-id', 1, 99),
    );

    expect(result).toMatchObject({
      id: 'return-public-id',
      orderId: 'order-public-id',
      status: 'refunded',
      totalAmount: 100,
    });
    expect(repo.save.mock.calls[0]?.[0]).toMatchObject({
      status: 'refunded',
      refund_amount: 100,
    });
  });

  it('refunds an approved return for a custom partial amount', async () => {
    const repo = new FakeReturnRequestRepo(buildEntity());
    const handler = new RefundReturnHandler(repo as never);

    const result = await handler.execute(
      new RefundReturnCommand('return-public-id', 1, 99, 60),
    );

    expect(result.totalAmount).toBe(60);
    expect(repo.save.mock.calls[0]?.[0]).toMatchObject({
      status: 'refunded',
      refund_amount: 60,
    });
  });
});
