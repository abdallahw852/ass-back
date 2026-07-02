import { RejectReturnCommand } from './reject-return.command';
import { RejectReturnHandler } from './reject-return.handler';
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
    status: 'pending',
    rejection_reason: null,
    total_amount: 100,
    items_count: 2,
    currency: 'SAR',
    refund_amount: null,
    reviewed_by_id: null,
    reviewed_at: null,
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

describe('RejectReturnHandler', () => {
  it('throws ReturnRequestNotFoundException when the return request does not exist', async () => {
    const repo = new FakeReturnRequestRepo(null);
    const handler = new RejectReturnHandler(repo as never);

    await expect(
      handler.execute(new RejectReturnCommand('missing-id', 1, 99)),
    ).rejects.toThrow(ReturnRequestNotFoundException);
  });

  it('throws ReturnRequestAccessDeniedException when the return belongs to another supplier', async () => {
    const repo = new FakeReturnRequestRepo(buildEntity({ supplier_id: 2 }));
    const handler = new RejectReturnHandler(repo as never);

    await expect(
      handler.execute(new RejectReturnCommand('return-public-id', 1, 99)),
    ).rejects.toThrow(ReturnRequestAccessDeniedException);
  });

  it('throws InvalidReturnStatusTransitionException when the return is not pending', async () => {
    const repo = new FakeReturnRequestRepo(buildEntity({ status: 'rejected' }));
    const handler = new RejectReturnHandler(repo as never);

    await expect(
      handler.execute(new RejectReturnCommand('return-public-id', 1, 99)),
    ).rejects.toThrow(InvalidReturnStatusTransitionException);
  });

  it('rejects a pending return request with a reason and returns the updated read model', async () => {
    const repo = new FakeReturnRequestRepo(buildEntity());
    const handler = new RejectReturnHandler(repo as never);

    const result = await handler.execute(
      new RejectReturnCommand(
        'return-public-id',
        1,
        99,
        'Outside return window',
      ),
    );

    expect(result).toMatchObject({
      id: 'return-public-id',
      orderId: 'order-public-id',
      customerName: 'John Buyer',
      status: 'rejected',
    });
    expect(repo.save.mock.calls[0]?.[0]).toMatchObject({
      status: 'rejected',
      rejection_reason: 'Outside return window',
      reviewed_by_id: 99,
    });
  });

  it('rejects without a reason, storing null rejection_reason', async () => {
    const repo = new FakeReturnRequestRepo(buildEntity());
    const handler = new RejectReturnHandler(repo as never);

    await handler.execute(new RejectReturnCommand('return-public-id', 1, 99));

    expect(repo.save.mock.calls[0]?.[0]).toMatchObject({
      status: 'rejected',
      rejection_reason: null,
    });
  });
});
