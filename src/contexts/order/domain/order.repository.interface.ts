import { TradeOrder } from './trade-order.entity';

export const TRADE_ORDER_REPOSITORY = Symbol('TRADE_ORDER_REPOSITORY');

export interface ITradeOrderRepository {
  save(order: TradeOrder): Promise<TradeOrder>;
  saveMany(orders: TradeOrder[]): Promise<TradeOrder[]>;
  findByPublicId(id: string): Promise<TradeOrder | null>;
  findByInternalId(id: number): Promise<TradeOrder | null>;
  findByPaymobOrderId(paymobOrderId: string): Promise<TradeOrder[]>;
  findByBuyerId(buyerId: number): Promise<TradeOrder[]>;
  findBySupplierId(supplierId: number): Promise<TradeOrder[]>;
  findDeliveredForAutoRelease(now: Date): Promise<TradeOrder[]>;
  findPendingPaymentByRfqAndBuyer(
    rfqId: string,
    buyerId: number,
  ): Promise<{
    id: string;
    clientSecret: string | null;
    subtotal: number;
    currency: string;
  } | null>;
  findStatusByRfqId(rfqId: string): Promise<string | null>;
  setRfqLink(
    orderId: string,
    rfqId: string,
    clientSecret: string,
  ): Promise<void>;
  update(order: TradeOrder): Promise<void>;
}
