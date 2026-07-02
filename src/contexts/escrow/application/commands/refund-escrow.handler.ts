import { CommandHandler, EventBus, type ICommandHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { RefundEscrowCommand } from './refund-escrow.command';
import { EscrowOrmEntity } from '../../infrastructure/persistence/escrow.orm-entity';
import { LedgerEntryOrmEntity } from '../../infrastructure/persistence/ledger-entry.orm-entity';
import {
  PAYMENT_GATEWAY_PORT,
  type PaymentGatewayPort,
} from '../../../payment/application/ports/payment-gateway.port';

@CommandHandler(RefundEscrowCommand)
export class RefundEscrowHandler implements ICommandHandler<RefundEscrowCommand> {
  private readonly logger = new Logger(RefundEscrowHandler.name);

  constructor(
    @InjectRepository(EscrowOrmEntity, 'write')
    private readonly escrowRepo: Repository<EscrowOrmEntity>,
    @InjectRepository(LedgerEntryOrmEntity, 'write')
    private readonly ledgerRepo: Repository<LedgerEntryOrmEntity>,
    @Inject(PAYMENT_GATEWAY_PORT)
    private readonly paymentGateway: PaymentGatewayPort,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: RefundEscrowCommand): Promise<void> {
    const escrow = await this.escrowRepo.findOne({
      where: { order_id: command.orderInternalId },
    });

    const correlationId = randomUUID();
    const now = new Date();

    // Call Paymob refund API if escrow has a provider reference
    if (escrow?.provider_ref) {
      try {
        await this.paymentGateway.refund({
          providerRef: escrow.provider_ref,
          amountCents: Math.round(command.amount * 100),
          idempotencyKey: `refund-${command.orderId}-${correlationId}`,
        });
      } catch (err) {
        this.logger.error(
          `Paymob refund failed for order ${command.orderId}`,
          err,
        );
      }
    }

    if (escrow) {
      escrow.status = 'refunded';
      escrow.refunded_at = now;
      await this.escrowRepo.save(escrow);

      // Reverse escrow_liability, credit buyer_refund
      await this.ledgerRepo.save([
        this.ledgerRepo.create({
          _id: randomUUID(),
          order_id: command.orderInternalId,
          escrow_id: escrow.id,
          account_kind: 'escrow_liability',
          account_owner_id: command.supplierId,
          direction: 'debit',
          amount: command.amount,
          currency: command.currency,
          kind: 'refund_out',
          correlation_id: correlationId,
        }),
        this.ledgerRepo.create({
          _id: randomUUID(),
          order_id: command.orderInternalId,
          escrow_id: escrow.id,
          account_kind: 'buyer_refund',
          account_owner_id: command.buyerId,
          direction: 'credit',
          amount: command.amount,
          currency: command.currency,
          kind: 'refund_out',
          correlation_id: correlationId,
        }),
      ]);
    }
  }
}
