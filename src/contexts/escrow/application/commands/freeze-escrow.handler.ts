import { CommandHandler, EventBus, type ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FreezeEscrowCommand } from './freeze-escrow.command';
import { EscrowOrmEntity } from '../../infrastructure/persistence/escrow.orm-entity';
import { EscrowFrozenEvent } from '../../domain/events/escrow-frozen.event';

@CommandHandler(FreezeEscrowCommand)
export class FreezeEscrowHandler implements ICommandHandler<FreezeEscrowCommand> {
  constructor(
    @InjectRepository(EscrowOrmEntity, 'write')
    private readonly escrowRepo: Repository<EscrowOrmEntity>,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: FreezeEscrowCommand): Promise<void> {
    const escrow = await this.escrowRepo.findOne({
      where: { order_id: command.orderInternalId },
    });
    if (!escrow || escrow.status !== 'funded') return;

    escrow.status = 'disputed';
    await this.escrowRepo.save(escrow);

    this.eventBus.publish(
      new EscrowFrozenEvent(escrow._id, String(command.orderInternalId)),
    );
  }
}
