import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UnfreezeEscrowCommand } from './unfreeze-escrow.command';
import { EscrowOrmEntity } from '../../infrastructure/persistence/escrow.orm-entity';

@CommandHandler(UnfreezeEscrowCommand)
export class UnfreezeEscrowHandler implements ICommandHandler<UnfreezeEscrowCommand> {
  constructor(
    @InjectRepository(EscrowOrmEntity, 'write')
    private readonly escrowRepo: Repository<EscrowOrmEntity>,
  ) {}

  async execute(command: UnfreezeEscrowCommand): Promise<void> {
    const escrow = await this.escrowRepo.findOne({
      where: { order_id: command.orderInternalId },
    });
    if (!escrow || escrow.status !== 'disputed') return;

    escrow.status = 'funded';
    await this.escrowRepo.save(escrow);
  }
}
