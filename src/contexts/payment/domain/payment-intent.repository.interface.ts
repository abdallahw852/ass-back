import type { PaymentRecordOrmEntity } from '../infrastructure/persistence/payment-intent.orm-entity';

export const PAYMENT_RECORD_REPOSITORY = Symbol('PAYMENT_RECORD_REPOSITORY');

export interface IPaymentRecordRepository {
  findByPaymentIntentId(
    intentId: string,
  ): Promise<PaymentRecordOrmEntity | null>;
  findByPaymobOrderId(
    paymobOrderId: string,
  ): Promise<PaymentRecordOrmEntity | null>;
  save(input: Partial<PaymentRecordOrmEntity>): Promise<PaymentRecordOrmEntity>;
}
