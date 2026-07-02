import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ListWithdrawalsQuery } from './list-withdrawals.query';
import { WithdrawalRequestOrmEntity } from '../../infrastructure/persistence/withdrawal-request.orm-entity';

@QueryHandler(ListWithdrawalsQuery)
export class ListWithdrawalsHandler implements IQueryHandler<
  ListWithdrawalsQuery,
  WithdrawalRequestOrmEntity[]
> {
  constructor(
    @InjectRepository(WithdrawalRequestOrmEntity, 'write')
    private readonly withdrawalRepo: Repository<WithdrawalRequestOrmEntity>,
  ) {}

  execute(query: ListWithdrawalsQuery): Promise<WithdrawalRequestOrmEntity[]> {
    return this.withdrawalRepo.find({
      where: { supplier_id: query.supplierId },
      order: { created_at: 'DESC' },
    });
  }
}
