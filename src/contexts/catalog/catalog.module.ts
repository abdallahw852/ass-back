import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SharedModule } from '../../shared/shared.module';

import { CatalogController } from './presentation/catalog.controller';
import { CatalogRepository } from './infrastructure/repositories/catalog.repository';

import { ProductOrmEntity } from '../product/infrastructure/persistence/product.orm-entity';

import { CatalogQueryHandlers } from './application/queries/handlers';
import { CatalogCommandHandlers } from './application/commands/handlers';

@Module({
  imports: [
    CqrsModule,
    SharedModule,
    // Reuses the write DB product + supplier entities for JOIN queries
    TypeOrmModule.forFeature([ProductOrmEntity], 'write'),
  ],
  controllers: [CatalogController],
  providers: [
    CatalogRepository,
    ...CatalogQueryHandlers,
    ...CatalogCommandHandlers,
  ],
})
export class CatalogModule {}
