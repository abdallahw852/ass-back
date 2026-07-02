import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AddPayoutMethodCommand } from './add-payout-method.command';
import { PayoutMethodOrmEntity } from '../../infrastructure/persistence/payout-method.orm-entity';

@CommandHandler(AddPayoutMethodCommand)
export class AddPayoutMethodHandler implements ICommandHandler<
  AddPayoutMethodCommand,
  PayoutMethodOrmEntity
> {
  constructor(
    @InjectRepository(PayoutMethodOrmEntity, 'write')
    private readonly payoutMethodRepo: Repository<PayoutMethodOrmEntity>,
  ) {}

  async execute(
    command: AddPayoutMethodCommand,
  ): Promise<PayoutMethodOrmEntity> {
    const entity = this.payoutMethodRepo.create({
      supplier_id: command.supplierId,
      type: command.type,
      bank_name: command.bankName,
      account_name: command.accountName,
      iban: command.iban,
    });
    return this.payoutMethodRepo.save(entity);
  }
}
