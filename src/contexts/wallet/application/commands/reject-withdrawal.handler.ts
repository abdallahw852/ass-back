import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RejectWithdrawalCommand } from './reject-withdrawal.command';
import { WithdrawalRequestOrmEntity } from '../../infrastructure/persistence/withdrawal-request.orm-entity';
import {
  WithdrawalAlreadyProcessedException,
  WithdrawalNotFoundException,
} from '../../domain/wallet.exceptions';
import { AppendAuditEventCommand } from '../../../audit-log/application/commands/append-audit-event.command';

@CommandHandler(RejectWithdrawalCommand)
export class RejectWithdrawalHandler implements ICommandHandler<
  RejectWithdrawalCommand,
  WithdrawalRequestOrmEntity
> {
  constructor(
    @InjectRepository(WithdrawalRequestOrmEntity, 'write')
    private readonly withdrawalRepo: Repository<WithdrawalRequestOrmEntity>,
    private readonly commandBus: CommandBus,
  ) {}

  async execute(
    command: RejectWithdrawalCommand,
  ): Promise<WithdrawalRequestOrmEntity> {
    const withdrawal = await this.withdrawalRepo.findOne({
      where: { _id: command.withdrawalId },
    });
    if (!withdrawal) throw new WithdrawalNotFoundException();
    if (withdrawal.status !== 'pending') {
      throw new WithdrawalAlreadyProcessedException();
    }

    withdrawal.status = 'rejected';
    withdrawal.rejection_reason = command.reason;
    const saved = await this.withdrawalRepo.save(withdrawal);

    await this.commandBus.execute(
      new AppendAuditEventCommand(
        'withdrawal',
        withdrawal._id,
        'withdrawal.rejected',
        command.adminId,
        command.adminRole,
        {
          supplierId: withdrawal.supplier_id,
          amount: Number(withdrawal.amount),
          reason: command.reason,
        },
      ),
    );

    return saved;
  }
}
