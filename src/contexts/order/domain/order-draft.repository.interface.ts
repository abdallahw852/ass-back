import type { OrderDraftOrmEntity } from '../infrastructure/persistence/order-draft.orm-entity';

export const ORDER_DRAFT_REPOSITORY = Symbol('ORDER_DRAFT_REPOSITORY');

export interface IOrderDraftRepository {
  save(input: Partial<OrderDraftOrmEntity>): Promise<OrderDraftOrmEntity>;
  findByPublicId(id: string): Promise<OrderDraftOrmEntity | null>;
  findPendingByRfqAndBuyer(
    rfqId: string,
    buyerId: number,
  ): Promise<OrderDraftOrmEntity | null>;
  updateStatus(id: number, status: string): Promise<void>;
}
