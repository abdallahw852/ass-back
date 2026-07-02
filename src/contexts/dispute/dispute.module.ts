import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DisputeOrmEntity } from './infrastructure/persistence/dispute.orm-entity';
import { DisputeController } from './presentation/dispute.controller';
import { AdminDisputesController } from './presentation/admin-disputes.controller';
import { ResolveDisputeHandler } from '../order/application/commands/resolve-dispute.handler';
import { ListDisputesHandler } from './application/queries/list-disputes.handler';
import { GetDisputeHandler } from './application/queries/get-dispute.handler';
import { OrderModule } from '../order/order.module';

@Module({
  imports: [
    CqrsModule,
    OrderModule,
    TypeOrmModule.forFeature([DisputeOrmEntity], 'write'),
  ],
  controllers: [DisputeController, AdminDisputesController],
  providers: [ResolveDisputeHandler, ListDisputesHandler, GetDisputeHandler],
  exports: [TypeOrmModule],
})
export class DisputeModule {}
