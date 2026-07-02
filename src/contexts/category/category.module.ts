import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SharedModule } from '../../shared/shared.module';

import { CategoryController } from './presentation/category.controller';

import { CategoryOrmEntity } from './infrastructure/persistence/category.orm-entity';
import { CategoryRepository } from './infrastructure/repositories/category.repository';
import { CATEGORY_REPOSITORY } from './domain/category.repository.interface';

import { CategoryCommandHandlers } from './application/commands/handlers';
import { CategoryQueryHandlers } from './application/queries/handlers';

@Module({
  imports: [
    CqrsModule,
    SharedModule,
    TypeOrmModule.forFeature([CategoryOrmEntity], 'write'),
  ],
  controllers: [CategoryController],
  providers: [
    ...CategoryCommandHandlers,
    ...CategoryQueryHandlers,

    CategoryRepository,
    { provide: CATEGORY_REPOSITORY, useExisting: CategoryRepository },
  ],
  exports: [{ provide: CATEGORY_REPOSITORY, useExisting: CategoryRepository }],
})
export class CategoryModule {}
