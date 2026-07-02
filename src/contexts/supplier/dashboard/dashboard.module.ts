import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SupplierDashboardController } from './presentation/supplier-dashboard.controller';
import { GetSupplierHomeStatsHandler } from './application/queries/get-supplier-home-stats.handler';
import { SupplierOrmEntity } from '../identity/infrastructure/persistence/supplier.orm-entity';
import { TradeOrderOrmEntity } from '../../order/infrastructure/persistence/trade-order.orm-entity';
import { PaymentRecordOrmEntity } from '../../payment/infrastructure/persistence/payment-intent.orm-entity';
import { UserOrmEntity } from '../../auth/infrastructure/persistence/user.orm-entity';

const queryHandlers = [GetSupplierHomeStatsHandler];

@Module({
  imports: [
    CqrsModule,
    TypeOrmModule.forFeature(
      [
        SupplierOrmEntity,
        TradeOrderOrmEntity,
        PaymentRecordOrmEntity,
        UserOrmEntity,
      ],
      'write',
    ),
  ],
  controllers: [SupplierDashboardController],
  providers: [...queryHandlers],
})
export class SupplierDashboardModule {}
