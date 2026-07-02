import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ShippingController } from './presentation/shipping.controller';
import { AdminWarehousesController } from './presentation/admin-warehouses.controller';
import { ShippingService } from './application/shipping.service';
import { OrderModule } from '../order/order.module';
import { CartModule } from '../cart/cart.module';
import { SharedModule } from '../../shared/shared.module';
import { ShipmentOrmEntity } from './infrastructure/persistence/shipment.orm-entity';
import { ShipmentRepository } from './infrastructure/shipment.repository';
import { SHIPMENT_REPOSITORY } from './domain/shipment.repository.interface';
import { NoopPlatformShippingAdapter } from './infrastructure/noop-platform-shipping.adapter';
import { TorodPlatformShippingAdapter } from './infrastructure/torod-platform-shipping.adapter';
import { PLATFORM_SHIPPING_PORT } from './application/ports/platform-shipping.port';
import { RequestPlatformShipmentHandler } from './application/commands/request-platform-shipment.handler';
import { CancelPlatformShipmentHandler } from './application/commands/cancel-platform-shipment.handler';
import { UpdateShipmentFromWebhookHandler } from './application/commands/update-shipment-from-webhook.handler';
import { TrackShipmentHandler } from './application/queries/track-shipment.handler';
import { GetShippingRatesHandler } from './application/queries/get-shipping-rates.handler';
import { PlatformShippingSaga } from './application/sagas/platform-shipping.saga';
import { UserOrmEntity } from '../auth/infrastructure/persistence/user.orm-entity';

const commandHandlers = [
  RequestPlatformShipmentHandler,
  CancelPlatformShipmentHandler,
  UpdateShipmentFromWebhookHandler,
];
const queryHandlers = [TrackShipmentHandler, GetShippingRatesHandler];

@Module({
  imports: [
    CqrsModule,
    ConfigModule,
    OrderModule,
    CartModule,
    SharedModule,
    TypeOrmModule.forFeature([ShipmentOrmEntity, UserOrmEntity], 'write'),
  ],
  controllers: [ShippingController, AdminWarehousesController],
  providers: [
    ShippingService,
    ShipmentRepository,
    { provide: SHIPMENT_REPOSITORY, useExisting: ShipmentRepository },
    NoopPlatformShippingAdapter,
    TorodPlatformShippingAdapter,
    {
      provide: PLATFORM_SHIPPING_PORT,
      useFactory: (
        configService: ConfigService,
        noop: NoopPlatformShippingAdapter,
        torod: TorodPlatformShippingAdapter,
      ) => {
        const provider =
          configService.get<string>('PLATFORM_SHIPPING_PROVIDER') ?? 'torod';
        return provider === 'noop' ? noop : torod;
      },
      inject: [
        ConfigService,
        NoopPlatformShippingAdapter,
        TorodPlatformShippingAdapter,
      ],
    },
    PlatformShippingSaga,
    ...commandHandlers,
    ...queryHandlers,
  ],
  exports: [
    { provide: SHIPMENT_REPOSITORY, useExisting: ShipmentRepository },
    ShipmentRepository,
  ],
})
export class ShippingModule {}
