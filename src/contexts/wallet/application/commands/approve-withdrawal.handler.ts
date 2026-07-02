import { Inject } from '@nestjs/common';
import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository, getDataSourceToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ApproveWithdrawalCommand } from './approve-withdrawal.command';
import { SupplierWalletOrmEntity } from '../../infrastructure/persistence/supplier-wallet.orm-entity';
import { WithdrawalRequestOrmEntity } from '../../infrastructure/persistence/withdrawal-request.orm-entity';
import {
  InsufficientWalletBalanceException,
  WithdrawalAlreadyProcessedException,
  WithdrawalNotFoundException,
} from '../../domain/wallet.exceptions';
import { AppendAuditEventCommand } from '../../../audit-log/application/commands/append-audit-event.command';

@CommandHandler(ApproveWithdrawalCommand)
export class ApproveWithdrawalHandler implements ICommandHandler<
  ApproveWithdrawalCommand,
  WithdrawalRequestOrmEntity
> {
  constructor(
    @InjectRepository(WithdrawalRequestOrmEntity, 'write')
    private readonly withdrawalRepo: Repository<WithdrawalRequestOrmEntity>,
    @InjectRepository(SupplierWalletOrmEntity, 'write')
    private readonly walletRepo: Repository<SupplierWalletOrmEntity>,
    @Inject(getDataSourceToken('write'))
    private readonly dataSource: DataSource,
    private readonly commandBus: CommandBus,
  ) {}

  async execute(
    command: ApproveWithdrawalCommand,
  ): Promise<WithdrawalRequestOrmEntity> {
    const withdrawal = await this.withdrawalRepo.findOne({
      where: { _id: command.withdrawalId },
    });
    if (!withdrawal) throw new WithdrawalNotFoundException();
    if (withdrawal.status !== 'pending') {
      throw new WithdrawalAlreadyProcessedException();
    }

    const wallet = await this.walletRepo.findOne({
      where: { supplier_id: withdrawal.supplier_id },
    });
    const currentBalance = wallet ? Number(wallet.balance) : 0;
    const amount = Number(withdrawal.amount);
    if (currentBalance < amount) {
      throw new InsufficientWalletBalanceException(currentBalance, amount);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Atomic status flip — only succeeds if still pending (idempotency guard)
      const updateResult = await queryRunner.manager.update(
        WithdrawalRequestOrmEntity,
        { _id: command.withdrawalId, status: 'pending' },
        { status: 'approved' },
      );

      if (updateResult.affected === 0) {
        throw new WithdrawalAlreadyProcessedException();
      }

      await queryRunner.manager
        .createQueryBuilder()
        .update(SupplierWalletOrmEntity)
        .set({ balance: () => `balance - ${amount}` })
        .where('supplier_id = :id', { id: withdrawal.supplier_id })
        .execute();

      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }

    const updated = await this.withdrawalRepo.findOneOrFail({
      where: { _id: command.withdrawalId },
    });

    await this.commandBus.execute(
      new AppendAuditEventCommand(
        'withdrawal',
        withdrawal._id,
        'withdrawal.approved',
        command.adminId,
        command.adminRole,
        { supplierId: withdrawal.supplier_id, amount },
      ),
    );

    return updated;
  }
}
