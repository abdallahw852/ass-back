import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RequestWithdrawalCommand } from './request-withdrawal.command';
import { SupplierWalletOrmEntity } from '../../infrastructure/persistence/supplier-wallet.orm-entity';
import { WithdrawalRequestOrmEntity } from '../../infrastructure/persistence/withdrawal-request.orm-entity';
import { InsufficientWalletBalanceException } from '../../domain/wallet.exceptions';

@CommandHandler(RequestWithdrawalCommand)
export class RequestWithdrawalHandler implements ICommandHandler<
  RequestWithdrawalCommand,
  WithdrawalRequestOrmEntity
> {
  constructor(
    @InjectRepository(SupplierWalletOrmEntity, 'write')
    private readonly walletRepo: Repository<SupplierWalletOrmEntity>,
    @InjectRepository(WithdrawalRequestOrmEntity, 'write')
    private readonly withdrawalRepo: Repository<WithdrawalRequestOrmEntity>,
  ) {}

  async execute(
    command: RequestWithdrawalCommand,
  ): Promise<WithdrawalRequestOrmEntity> {
    const wallet = await this.walletRepo.findOne({
      where: { supplier_id: command.supplierId },
    });
    const currentBalance = wallet ? Number(wallet.balance) : 0;

    if (command.amount > currentBalance) {
      throw new InsufficientWalletBalanceException(
        currentBalance,
        command.amount,
      );
    }

    const entity = this.withdrawalRepo.create({
      supplier_id: command.supplierId,
      amount: command.amount,
      payout_method_id: command.payoutMethodId,
    });
    return this.withdrawalRepo.save(entity);
  }
}
