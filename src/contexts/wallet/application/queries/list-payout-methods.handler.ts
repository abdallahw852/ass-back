import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ListPayoutMethodsQuery } from './list-payout-methods.query';
import { PayoutMethodOrmEntity } from '../../infrastructure/persistence/payout-method.orm-entity';

@QueryHandler(ListPayoutMethodsQuery)
export class ListPayoutMethodsHandler implements IQueryHandler<
  ListPayoutMethodsQuery,
  PayoutMethodOrmEntity[]
> {
  constructor(
    @InjectRepository(PayoutMethodOrmEntity, 'write')
    private readonly payoutMethodRepo: Repository<PayoutMethodOrmEntity>,
  ) {}

  execute(query: ListPayoutMethodsQuery): Promise<PayoutMethodOrmEntity[]> {
    return this.payoutMethodRepo.find({
      where: { supplier_id: query.supplierId },
      order: { created_at: 'DESC' },
    });
  }
}
