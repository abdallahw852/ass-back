import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BuyerDashboardController } from './presentation/buyer-dashboard.controller';
import { BuyerDashboardService } from './application/buyer-dashboard.service';
import { GetBuyerHomeHandler } from './application/queries/get-buyer-home.handler';
import { GetBuyerOrderManagementHandler } from './application/queries/get-buyer-order-management.handler';
import { GetBuyerRfqManagementHandler } from './application/queries/get-buyer-rfq-management.handler';
import { GetBuyerAccountSettingsHandler } from './application/queries/get-buyer-account-settings.handler';
import { TradeOrderOrmEntity } from '../order/infrastructure/persistence/trade-order.orm-entity';
import { RfqOrmEntity } from '../rfq/infrastructure/persistence/rfq.orm-entity';
import { UserOrmEntity } from '../auth/infrastructure/persistence/user.orm-entity';
import { SupplierOrmEntity } from '../supplier/identity/infrastructure/persistence/supplier.orm-entity';

const queryHandlers = [
  GetBuyerHomeHandler,
  GetBuyerOrderManagementHandler,
  GetBuyerRfqManagementHandler,
  GetBuyerAccountSettingsHandler,
];

@Module({
  imports: [
    CqrsModule,
    TypeOrmModule.forFeature(
      [TradeOrderOrmEntity, RfqOrmEntity, UserOrmEntity, SupplierOrmEntity],
      'write',
    ),
  ],
  controllers: [BuyerDashboardController],
  providers: [BuyerDashboardService, ...queryHandlers],
})
export class BuyerDashboardModule {}
