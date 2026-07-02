import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsController } from './presentation/analytics.controller';
import { AnalyticsEventOrmEntity } from './infrastructure/persistence/analytics-event.orm-entity';
import { AnalyticsEventRepository } from './infrastructure/analytics-event.repository';
import { ANALYTICS_EVENT_REPOSITORY } from './domain/analytics-event.repository.interface';
import { TrackEventHandler } from './application/commands/track-event.handler';
import { GetPlatformOverviewHandler } from './application/queries/get-supplier-report.handler';
import { GetConversionFunnelHandler } from './application/queries/get-conversion-funnel.handler';
import { GetKeywordPerformanceHandler } from './application/queries/get-keyword-performance.handler';
import { GetAdminAnalyticsHandler } from './application/queries/get-admin-analytics.handler';
import { PaymentRecordOrmEntity } from '../payment/infrastructure/persistence/payment-intent.orm-entity';
import { AuditEventOrmEntity } from '../audit-log/infrastructure/persistence/audit-event.orm-entity';
import { UserOrmEntity } from '../auth/infrastructure/persistence/user.orm-entity';
import { TradeOrderOrmEntity } from '../order/infrastructure/persistence/trade-order.orm-entity';
import { CartOrmEntity } from '../cart/infrastructure/persistence/cart.orm-entity';

const commandHandlers = [TrackEventHandler];
const queryHandlers = [
  GetPlatformOverviewHandler,
  GetConversionFunnelHandler,
  GetKeywordPerformanceHandler,
  GetAdminAnalyticsHandler,
];

@Module({
  imports: [
    CqrsModule,
    TypeOrmModule.forFeature(
      [
        AnalyticsEventOrmEntity,
        PaymentRecordOrmEntity,
        AuditEventOrmEntity,
        UserOrmEntity,
        TradeOrderOrmEntity,
        CartOrmEntity,
      ],
      'write',
    ),
  ],
  controllers: [AnalyticsController],
  providers: [
    ...commandHandlers,
    ...queryHandlers,
    AnalyticsEventRepository,
    {
      provide: ANALYTICS_EVENT_REPOSITORY,
      useExisting: AnalyticsEventRepository,
    },
  ],
})
export class AnalyticsModule {}
