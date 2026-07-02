import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { PaymentController } from './presentation/payment.controller';
import { AdminTransactionsController } from './presentation/admin-transactions.controller';
import { PaymentRecordOrmEntity } from './infrastructure/persistence/payment-intent.orm-entity';
import { PaymentRecordRepository } from './infrastructure/payment-intent.repository';
import { PAYMENT_RECORD_REPOSITORY } from './domain/payment-intent.repository.interface';
import { SharedModule } from '../../shared/shared.module';
import { PaymobPaymentAdapter } from './infrastructure/paymob-payment.adapter';
import { PAYMENT_GATEWAY_PORT } from './application/ports/payment-gateway.port';
import { WithdrawalRequestOrmEntity } from '../wallet/infrastructure/persistence/withdrawal-request.orm-entity';

@Module({
  imports: [
    CqrsModule,
    SharedModule,
    TypeOrmModule.forFeature(
      [PaymentRecordOrmEntity, WithdrawalRequestOrmEntity],
      'write',
    ),
  ],
  controllers: [PaymentController, AdminTransactionsController],
  providers: [
    PaymentRecordRepository,
    {
      provide: PAYMENT_RECORD_REPOSITORY,
      useExisting: PaymentRecordRepository,
    },
    PaymobPaymentAdapter,
    {
      provide: PAYMENT_GATEWAY_PORT,
      useExisting: PaymobPaymentAdapter,
    },
  ],
  exports: [
    {
      provide: PAYMENT_RECORD_REPOSITORY,
      useExisting: PaymentRecordRepository,
    },
    PAYMENT_GATEWAY_PORT,
  ],
})
export class PaymentModule {}
