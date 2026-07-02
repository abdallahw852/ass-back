import { CommandHandler, EventBus, type ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { FundEscrowCommand } from './fund-escrow.command';
import { EscrowOrmEntity } from '../../infrastructure/persistence/escrow.orm-entity';
import { LedgerEntryOrmEntity } from '../../infrastructure/persistence/ledger-entry.orm-entity';
import { EscrowFundedEvent } from '../../domain/events/escrow-funded.event';

@CommandHandler(FundEscrowCommand)
export class FundEscrowHandler implements ICommandHandler<FundEscrowCommand> {
  constructor(
    @InjectRepository(EscrowOrmEntity, 'write')
    private readonly escrowRepo: Repository<EscrowOrmEntity>,
    @InjectRepository(LedgerEntryOrmEntity, 'write')
    private readonly ledgerRepo: Repository<LedgerEntryOrmEntity>,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: FundEscrowCommand): Promise<void> {
    const correlationId = randomUUID();

    const escrow = this.escrowRepo.create({
      _id: randomUUID(),
      order_id: command.orderInternalId,
      buyer_id: command.buyerId,
      supplier_id: command.supplierId,
      amount: command.amount,
      currency: command.currency,
      status: 'funded',
      provider_ref: command.providerRef,
    });
    const saved = await this.escrowRepo.save(escrow);

    // Double-entry: debit platform_cash (cash received), credit escrow_liability (owed to supplier)
    await this.ledgerRepo.save([
      this.ledgerRepo.create({
        _id: randomUUID(),
        order_id: command.orderInternalId,
        escrow_id: saved.id,
        account_kind: 'platform_cash',
        account_owner_id: null,
        direction: 'debit',
        amount: command.amount,
        currency: command.currency,
        kind: 'payment_in',
        correlation_id: correlationId,
      }),
      this.ledgerRepo.create({
        _id: randomUUID(),
        order_id: command.orderInternalId,
        escrow_id: saved.id,
        account_kind: 'escrow_liability',
        account_owner_id: command.supplierId,
        direction: 'credit',
        amount: command.amount,
        currency: command.currency,
        kind: 'escrow_hold',
        correlation_id: correlationId,
      }),
    ]);

    this.eventBus.publish(
      new EscrowFundedEvent(
        saved._id,
        command.orderId,
        command.buyerId,
        command.supplierId,
        command.amount,
        command.currency,
      ),
    );
  }
}
