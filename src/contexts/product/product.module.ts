import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { SharedModule } from '../../shared/shared.module';
import { SupplierModule } from '../supplier/identity/identity.module';
import { CategoryModule } from '../category/category.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { IsFullyVerifiedSupplier } from '../../shared/infrastructure/guards/is-fully-verified-supplier.guard';
import { AdminGuard } from '../../shared/guards/admin.guard';
import { EntitlementModule } from '../entitlement/entitlement.module';

// ── Presentation ──────────────────────────────────────────────
import { ProductController } from './presentation/product.controller';
import { AdminProductsController } from './presentation/admin-products.controller';

// ── ORM entities ──────────────────────────────────────────────
import { ProductOrmEntity } from './infrastructure/persistence/product.orm-entity';
import { ProductVariantOrmEntity } from './infrastructure/persistence/product-variant.orm-entity';
import { ProductBundleItemOrmEntity } from './infrastructure/persistence/product-bundle-item.orm-entity';
import { PricingTierOrmEntity } from './infrastructure/persistence/pricing-tier.orm-entity';

// ── Write repositories ────────────────────────────────────────
import { ProductRepository } from './infrastructure/repositories/product.repository';
import { ProductVariantRepository } from './infrastructure/repositories/product-variant.repository';
import { ProductBundleItemRepository } from './infrastructure/repositories/product-bundle-item.repository';
import { PRODUCT_REPOSITORY } from './domain/product.repository.interface';
import { PRODUCT_VARIANT_REPOSITORY } from './domain/product-variant.repository.interface';
import { PRODUCT_BUNDLE_ITEM_REPOSITORY } from './domain/product-bundle-item.repository.interface';

// ── Read repository ───────────────────────────────────────────
import { ProductReadRepository } from './infrastructure/repositories/product-read.repository';
import { PRODUCT_READ_REPOSITORY } from './domain/product-read.repository.interface';

// ── Command handlers ──────────────────────────────────────────
import { CommandHandlers } from './application/commands/handlers';

// ── Query handlers ────────────────────────────────────────────
import { QueryHandlers } from './application/queries/handlers';

@Module({
  imports: [
    CqrsModule,
    SharedModule,
    SupplierModule,
    CategoryModule,
    AuditLogModule,
    EntitlementModule,
    TypeOrmModule.forFeature(
      [
        ProductOrmEntity,
        ProductVariantOrmEntity,
        ProductBundleItemOrmEntity,
        PricingTierOrmEntity,
      ],
      'write',
    ),
  ],
  controllers: [ProductController, AdminProductsController],
  providers: [
    // Guards
    IsFullyVerifiedSupplier,
    AdminGuard,

    // Command & query handlers
    ...CommandHandlers,
    ...QueryHandlers,

    // Write repositories
    ProductRepository,
    ProductVariantRepository,
    ProductBundleItemRepository,
    { provide: PRODUCT_REPOSITORY, useExisting: ProductRepository },
    {
      provide: PRODUCT_VARIANT_REPOSITORY,
      useExisting: ProductVariantRepository,
    },
    {
      provide: PRODUCT_BUNDLE_ITEM_REPOSITORY,
      useExisting: ProductBundleItemRepository,
    },

    // Read repository
    ProductReadRepository,
    { provide: PRODUCT_READ_REPOSITORY, useExisting: ProductReadRepository },
  ],
  exports: [{ provide: PRODUCT_REPOSITORY, useExisting: ProductRepository }],
})
export class ProductModule {}
