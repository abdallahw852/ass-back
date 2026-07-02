import { APP_GUARD } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { SessionAuthGuard } from './shared/infrastructure/guards/session-auth.guard';
import { VerifiedUserGuard } from './shared/infrastructure/guards/verified-user.guard';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './contexts/auth/auth.module';
import { OrganizationModule } from './contexts/organization/organization.module';
import { NotificationModule } from './contexts/notification/notification.module';
import { MediaModule } from './contexts/media/media.module';
import { AuditLogModule } from './contexts/audit-log/audit-log.module';
import { SupportModule } from './contexts/support/support.module';
import { SupplierModule } from './contexts/supplier/identity/identity.module';
import { SubscriptionModule } from './contexts/supplier/subscription/subscription.module';
import { SupplierDashboardModule } from './contexts/supplier/dashboard/dashboard.module';
import { ProductModule } from './contexts/product/product.module';
import { OrderModule } from './contexts/order/order.module';
import { InventoryModule } from './contexts/inventory/inventory.module';
import { ShippingModule } from './contexts/shipping/shipping.module';
import { RfqModule } from './contexts/rfq/rfq.module';
import { WalletModule } from './contexts/wallet/wallet.module';
import { ReturnsModule } from './contexts/returns/returns.module';
import { MessagingModule } from './contexts/messaging/messaging.module';
import { AnalyticsModule } from './contexts/analytics/analytics.module';
import { InvoiceModule } from './contexts/invoice/invoice.module';
import { EscrowModule } from './contexts/escrow/escrow.module';
import { PaymentModule } from './contexts/payment/payment.module';
import { DisputeModule } from './contexts/dispute/dispute.module';
import { BuyerDashboardModule } from './contexts/buyer-dashboard/buyer-dashboard.module';
import { SearchModule } from './contexts/search/search.module';
import { CategoryModule } from './contexts/category/category.module';
import { CatalogModule } from './contexts/catalog/catalog.module';
import { ReviewModule } from './contexts/review/review.module';
import { WishlistModule } from './contexts/wishlist/wishlist.module';
import { CartModule } from './contexts/cart/cart.module';
import { ClientModule } from './contexts/client/client.module';
import { MonitoringModule } from './shared/monitoring/monitoring.module';
import { EntitlementModule } from './contexts/entitlement/entitlement.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([
      {
        name: 'otp-issue',
        ttl: 3600000,
        limit: 5,
      },
      {
        name: 'login',
        ttl: 900000,
        limit: 10,
      },
      {
        name: 'search',
        ttl: 60000,
        limit: 60,
      },
      {
        name: 'payment-mutating',
        ttl: 60000,
        limit: 10,
      },
    ]),
    TypeOrmModule.forRootAsync({
      name: 'write',
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host:
          config.get<string>('WRITE_DB_HOST') ||
          config.get<string>('DB_HOST') ||
          'localhost',
        port: config.get<number>('WRITE_DB_PORT') || 5432,
        username: config.get<string>('WRITE_DB_USER') || 'postgres',
        password: config.get<string>('WRITE_DB_PASS') || 'postgres',
        database: config.get<string>('WRITE_DB_NAME') || 'asas_write',
        synchronize: true,
        logging: process.env.NODE_ENV === 'development',
        autoLoadEntities: true,
        ssl:
          config.get<string>('WRITE_DB_SSL') === 'true'
            ? { rejectUnauthorized: false }
            : false,
      }),
    }),
    TypeOrmModule.forRootAsync({
      name: 'read',
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('READ_DB_HOST') || 'localhost',
        port: config.get<number>('READ_DB_PORT') || 5433,
        username: config.get<string>('READ_DB_USER') || 'postgres',
        password: config.get<string>('READ_DB_PASS') || 'postgres',
        database: config.get<string>('READ_DB_NAME') || 'asas_read',
        entities: [__dirname + '/**/*.read-model{.ts,.js}'],
        synchronize: false,
        logging: false,
        ssl:
          config.get<string>('READ_DB_SSL') === 'true'
            ? { rejectUnauthorized: false }
            : false,
      }),
    }),
    EntitlementModule,
    AuthModule,
    OrganizationModule,
    NotificationModule,
    MediaModule,
    AuditLogModule,
    SupportModule,
    SupplierModule,
    SubscriptionModule,
    SupplierDashboardModule,
    ProductModule,
    OrderModule,
    InventoryModule,
    ShippingModule,
    RfqModule,
    WalletModule,
    ReturnsModule,
    MessagingModule,
    AnalyticsModule,
    InvoiceModule,
    EscrowModule,
    PaymentModule,
    DisputeModule,
    BuyerDashboardModule,
    SearchModule,
    CategoryModule,
    CatalogModule,
    ReviewModule,
    WishlistModule,
    CartModule,
    ClientModule,
    MonitoringModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: SessionAuthGuard },
    { provide: APP_GUARD, useClass: VerifiedUserGuard },
  ],
})
export class AppModule {}
