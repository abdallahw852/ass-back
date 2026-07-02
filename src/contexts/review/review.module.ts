import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReviewOrmEntity } from './infrastructure/persistence/review.orm-entity';
import { ProductOrmEntity } from '../product/infrastructure/persistence/product.orm-entity';
import { ReviewRepository } from './infrastructure/repositories/review.repository';
import { REVIEW_REPOSITORY } from './domain/review.repository.interface';
import { ReviewCommandHandlers } from './application/commands/handlers';
import { ReviewQueryHandlers } from './application/queries/handlers';
import { ReviewController } from './presentation/review.controller';
import { SharedModule } from '../../shared/shared.module';

@Module({
  imports: [
    CqrsModule,
    SharedModule,
    TypeOrmModule.forFeature([ReviewOrmEntity, ProductOrmEntity], 'write'),
  ],
  providers: [
    ReviewRepository,
    { provide: REVIEW_REPOSITORY, useExisting: ReviewRepository },
    ...ReviewCommandHandlers,
    ...ReviewQueryHandlers,
  ],
  controllers: [ReviewController],
})
export class ReviewModule {}
