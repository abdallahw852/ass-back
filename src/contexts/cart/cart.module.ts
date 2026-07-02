import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CartOrmEntity } from './infrastructure/persistence/cart.orm-entity';
import { CartItemOrmEntity } from './infrastructure/persistence/cart-item.orm-entity';
import { CartSupplierGroupOrmEntity } from './infrastructure/persistence/cart-supplier-group.orm-entity';
import { CartAttachmentOrmEntity } from './infrastructure/persistence/cart-attachment.orm-entity';
import { CartRepository } from './infrastructure/repositories/cart.repository';
import { CartCommandHandlers } from './application/commands/handlers';
import { GetCartHandler } from './application/queries/get-cart.handler';
import { CartController } from './presentation/cart.controller';
import { SharedModule } from '../../shared/shared.module';
import { ProductOrmEntity } from '../product/infrastructure/persistence/product.orm-entity';
import { ProductVariantOrmEntity } from '../product/infrastructure/persistence/product-variant.orm-entity';
import { SupplierOrmEntity } from '../supplier/identity/infrastructure/persistence/supplier.orm-entity';

@Module({
  imports: [
    CqrsModule,
    SharedModule,
    TypeOrmModule.forFeature(
      [
        CartOrmEntity,
        CartItemOrmEntity,
        CartSupplierGroupOrmEntity,
        CartAttachmentOrmEntity,
        ProductOrmEntity,
        ProductVariantOrmEntity,
        SupplierOrmEntity,
      ],
      'write',
    ),
  ],
  providers: [CartRepository, ...CartCommandHandlers, GetCartHandler],
  controllers: [CartController],
  exports: [CartRepository],
})
export class CartModule {}
