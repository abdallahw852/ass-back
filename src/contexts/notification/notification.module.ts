import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationOrmEntity } from './infrastructure/persistence/notification.orm-entity';
import { NotificationRepository } from './infrastructure/notification.repository';
import { NOTIFICATION_REPOSITORY } from './domain/notification.repository.interface';
import { CreateNotificationHandler } from './application/commands/handlers/create-notification.handler';
import { MarkNotificationReadHandler } from './application/commands/handlers/mark-notification-read.handler';
import { MarkAllNotificationsReadHandler } from './application/commands/handlers/mark-all-notifications-read.handler';
import { ListNotificationsHandler } from './application/queries/handlers/list-notifications.handler';
import { NotificationController } from './presentation/notification.controller';
import { NotificationGateway } from './presentation/notification.gateway';
import { OrderNotificationsListener } from './presentation/event-listeners/order-notification.listener';
import { MessagingNotificationListener } from './presentation/event-listeners/messaging-notification.listener';
import { SupplierNotificationsListener } from './presentation/event-listeners/supplier-notification.listener';
import { ProductNotificationsListener } from './presentation/event-listeners/product-notification.listener';
import { SharedModule } from '../../shared/shared.module';
import { MessagingModule } from '../messaging/messaging.module';
import { UserOrmEntity } from '../auth/infrastructure/persistence/user.orm-entity';
import { TradeOrderOrmEntity } from '../order/infrastructure/persistence/trade-order.orm-entity';
import { SupplierOrmEntity } from '../supplier/identity/infrastructure/persistence/supplier.orm-entity';

const NotificationCommandHandlers = [
  CreateNotificationHandler,
  MarkNotificationReadHandler,
  MarkAllNotificationsReadHandler,
];

const NotificationQueryHandlers = [ListNotificationsHandler];

@Module({
  imports: [
    CqrsModule,
    SharedModule,
    MessagingModule,
    TypeOrmModule.forFeature(
      [
        NotificationOrmEntity,
        UserOrmEntity,
        TradeOrderOrmEntity,
        SupplierOrmEntity,
      ],
      'write',
    ),
  ],
  providers: [
    NotificationRepository,
    { provide: NOTIFICATION_REPOSITORY, useExisting: NotificationRepository },
    ...NotificationCommandHandlers,
    ...NotificationQueryHandlers,
    NotificationGateway,
    OrderNotificationsListener,
    MessagingNotificationListener,
    SupplierNotificationsListener,
    ProductNotificationsListener,
  ],
  controllers: [NotificationController],
  exports: [
    { provide: NOTIFICATION_REPOSITORY, useExisting: NotificationRepository },
  ],
})
export class NotificationModule {}
