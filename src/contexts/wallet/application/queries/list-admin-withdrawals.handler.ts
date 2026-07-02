import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ListAdminWithdrawalsQuery } from './list-admin-withdrawals.query';
import { WithdrawalRequestOrmEntity } from '../../infrastructure/persistence/withdrawal-request.orm-entity';
import { PayoutMethodOrmEntity } from '../../infrastructure/persistence/payout-method.orm-entity';

export interface AdminWithdrawalItem {
  id: string;
  supplierId: number;
  amount: number;
  currency: string;
  status: string;
  payoutMethodId: string;
  payoutMethodType: string | null;
  bankName: string | null;
  accountName: string | null;
  rejectionReason: string | null;
  createdAt: Date;
}

export interface ListAdminWithdrawalsResult {
  items: AdminWithdrawalItem[];
  total: number;
  page: number;
  limit: number;
}

@QueryHandler(ListAdminWithdrawalsQuery)
export class ListAdminWithdrawalsHandler implements IQueryHandler<
  ListAdminWithdrawalsQuery,
  ListAdminWithdrawalsResult
> {
  constructor(
    @InjectRepository(WithdrawalRequestOrmEntity, 'write')
    private readonly withdrawalRepo: Repository<WithdrawalRequestOrmEntity>,
    @InjectRepository(PayoutMethodOrmEntity, 'write')
    private readonly payoutMethodRepo: Repository<PayoutMethodOrmEntity>,
  ) {}

  async execute(
    query: ListAdminWithdrawalsQuery,
  ): Promise<ListAdminWithdrawalsResult> {
    const qb = this.withdrawalRepo.createQueryBuilder('w');

    if (query.status) {
      qb.where('w.status = :status', { status: query.status });
    }

    const offset = (query.page - 1) * query.limit;
    qb.orderBy('w.created_at', 'DESC').skip(offset).take(query.limit);

    const [rows, total] = await qb.getManyAndCount();

    const payoutIds = [...new Set(rows.map((r) => r.payout_method_id))];
    const payoutMethods =
      payoutIds.length > 0
        ? await this.payoutMethodRepo
            .createQueryBuilder('pm')
            .where('pm._id IN (:...ids)', { ids: payoutIds })
            .getMany()
        : [];
    const payoutMap = new Map<string, PayoutMethodOrmEntity>(
      payoutMethods.map((pm) => [pm._id, pm]),
    );

    const items: AdminWithdrawalItem[] = rows.map((w) => {
      const pm = payoutMap.get(w.payout_method_id) ?? null;
      return {
        id: w._id,
        supplierId: w.supplier_id,
        amount: Number(w.amount),
        currency: w.currency,
        status: w.status,
        payoutMethodId: w.payout_method_id,
        payoutMethodType: pm?.type ?? null,
        bankName: pm?.bank_name ?? null,
        accountName: pm?.account_name ?? null,
        rejectionReason: w.rejection_reason,
        createdAt: w.created_at,
      };
    });

    return { items, total, page: query.page, limit: query.limit };
  }
}
