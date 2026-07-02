import { CommandHandler, EventBus, type ICommandHandler } from '@nestjs/cqrs';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { Inject } from '@nestjs/common';
import { ReleaseMilestoneCommand } from './release-milestone.command';
import { EscrowOrmEntity } from '../../infrastructure/persistence/escrow.orm-entity';
import { LedgerEntryOrmEntity } from '../../infrastructure/persistence/ledger-entry.orm-entity';
import { SupplierWalletOrmEntity } from '../../../wallet/infrastructure/persistence/supplier-wallet.orm-entity';
import { EscrowReleasedEvent } from '../../domain/events/escrow-released.event';
import { ENTITLEMENT_SERVICE } from '../../../entitlement/domain/entitlement.service.interface';
import type { IEntitlementService } from '../../../entitlement/domain/entitlement.service.interface';

@CommandHandler(ReleaseMilestoneCommand)
export class ReleaseMilestoneHandler implements ICommandHandler<ReleaseMilestoneCommand> {
  constructor(
    @InjectDataSource('write')
    private readonly dataSource: DataSource,
    private readonly eventBus: EventBus,
    @Inject(ENTITLEMENT_SERVICE)
    private readonly entitlementService: IEntitlementService,
  ) {}

  async execute(command: ReleaseMilestoneCommand): Promise<void> {
    const correlationId = randomUUID();
    const now = new Date();
    let savedEscrow: EscrowOrmEntity | undefined;

    // Commission deduction
    const commissionRatePct = await this.entitlementService.getLimit(
      command.supplierId,
      'commission_rate',
    );
    const commission =
      commissionRatePct > 0
        ? Math.round(command.amount * commissionRatePct) / 100
        : 0;
    const supplierCredit = command.amount - commission;

    await this.dataSource.transaction(async (manager) => {
      const escrowRepo: Repository<EscrowOrmEntity> =
        manager.getRepository(EscrowOrmEntity);
      const ledgerRepo: Repository<LedgerEntryOrmEntity> =
        manager.getRepository(LedgerEntryOrmEntity);
      const walletRepo: Repository<SupplierWalletOrmEntity> =
        manager.getRepository(SupplierWalletOrmEntity);

      const escrow = await escrowRepo.findOne({
        where: { order_id: command.orderInternalId },
      });

      if (escrow) {
        escrow.status = 'released';
        escrow.released_at = now;
        savedEscrow = await escrowRepo.save(escrow);

        // Reverse escrow_liability, credit supplier_wallet (net of commission)
        const ledgerEntries = [
          ledgerRepo.create({
            _id: randomUUID(),
            order_id: command.orderInternalId,
            escrow_id: escrow.id,
            account_kind: 'escrow_liability',
            account_owner_id: command.supplierId,
            direction: 'debit',
            amount: command.amount,
            currency: command.currency,
            kind: 'escrow_release',
            correlation_id: correlationId,
          }),
          ledgerRepo.create({
            _id: randomUUID(),
            order_id: command.orderInternalId,
            escrow_id: escrow.id,
            account_kind: 'supplier_wallet',
            account_owner_id: command.supplierId,
            direction: 'credit',
            amount: supplierCredit,
            currency: command.currency,
            kind: 'escrow_release',
            correlation_id: correlationId,
          }),
        ];
        if (commission > 0) {
          ledgerEntries.push(
            ledgerRepo.create({
              _id: randomUUID(),
              order_id: command.orderInternalId,
              escrow_id: escrow.id,
              account_kind: 'platform_revenue',
              account_owner_id: command.supplierId,
              direction: 'credit',
              amount: commission,
              currency: command.currency,
              kind: 'platform_commission',
              correlation_id: correlationId,
            }),
          );
        }
        await ledgerRepo.save(ledgerEntries);
      }

      let wallet = await walletRepo.findOne({
        where: { supplier_id: command.supplierId },
      });
      if (!wallet) {
        wallet = walletRepo.create({
          supplier_id: command.supplierId,
          balance: 0,
          currency: command.currency,
        });
      }
      wallet.balance = Number(wallet.balance) + supplierCredit;
      wallet.updated_at = now;
      await walletRepo.save(wallet);
    });

    if (savedEscrow) {
      this.eventBus.publish(
        new EscrowReleasedEvent(
          savedEscrow._id,
          command.orderId,
          command.supplierId,
          command.amount,
          command.currency,
        ),
      );
    }
  }
}
