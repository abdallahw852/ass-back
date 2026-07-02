import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WishlistOrmEntity } from './infrastructure/persistence/wishlist.orm-entity';
import { ProductOrmEntity } from '../product/infrastructure/persistence/product.orm-entity';
import { WishlistRepository } from './infrastructure/repositories/wishlist.repository';
import { WishlistController } from './presentation/wishlist.controller';
import { SharedModule } from '../../shared/shared.module';

@Module({
  imports: [
    SharedModule,
    TypeOrmModule.forFeature([WishlistOrmEntity, ProductOrmEntity], 'write'),
  ],
  providers: [WishlistRepository],
  controllers: [WishlistController],
})
export class WishlistModule {}
