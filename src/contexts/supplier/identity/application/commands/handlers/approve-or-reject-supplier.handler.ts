import { Inject } from '@nestjs/common';
import {
  CommandBus,
  CommandHandler,
  EventBus,
  ICommandHandler,
} from '@nestjs/cqrs';
import { ApproveOrRejectSupplierCommand } from '../approve-or-reject-supplier.command';
import { SUPPLIER_REPOSITORY } from '../../../domain/repositories/supplier.repository.interface';
import type { ISupplierRepository } from '../../../domain/repositories/supplier.repository.interface';
import { SupplierVerificationStatus } from '../../../domain/enums/supplier-verification-status.enum';
import { AppendAuditEventCommand } from '../../../../../audit-log/application/commands/append-audit-event.command';
import { SupplierOrmEntity } from '../../../infrastructure/persistence/supplier.orm-entity';
import {
  InvalidSupplierStatusTransitionException,
  SupplierNotFoundException,
} from '../../../domain/supplier-identity.exceptions';
import { SupplierApprovedEvent } from '../../../domain/events/supplier-approved.event';
import { SupplierRejectedEvent } from '../../../domain/events/supplier-rejected.event';

@CommandHandler(ApproveOrRejectSupplierCommand)
export class ApproveOrRejectSupplierHandler implements ICommandHandler<
  ApproveOrRejectSupplierCommand,
  SupplierOrmEntity
> {
  constructor(
    @Inject(SUPPLIER_REPOSITORY)
    private readonly supplierRepository: ISupplierRepository,
    private readonly commandBus: CommandBus,
    private readonly eventBus: EventBus,
  ) {}

  async execute(
    command: ApproveOrRejectSupplierCommand,
  ): Promise<SupplierOrmEntity> {
    const supplier = await this.supplierRepository.findByPublicId(
      command.supplierId,
    );
    if (!supplier) throw new SupplierNotFoundException(command.supplierId);

    if (
      command.decision === 'approve' &&
      supplier.verificationStatus === SupplierVerificationStatus.APPROVED
    ) {
      throw new InvalidSupplierStatusTransitionException(
        'Supplier is already approved.',
      );
    }

    if (command.decision === 'reject') {
      if (supplier.verificationStatus === SupplierVerificationStatus.REJECTED) {
        throw new InvalidSupplierStatusTransitionException(
          'Supplier is already rejected.',
        );
      }
      if (!command.reason) {
        throw new InvalidSupplierStatusTransitionException(
          'A reason is required when rejecting a supplier.',
        );
      }
    }

    if (command.decision === 'approve') {
      supplier.verificationStatus = SupplierVerificationStatus.APPROVED;
      supplier.isVerified = true;
      supplier.rejectionReason = null;
    } else {
      supplier.verificationStatus = SupplierVerificationStatus.REJECTED;
      supplier.isVerified = false;
      supplier.rejectionReason = command.reason ?? null;
    }

    const saved = await this.supplierRepository.save(supplier);

    await this.commandBus.execute(
      new AppendAuditEventCommand(
        'supplier',
        supplier._id,
        command.decision === 'approve'
          ? 'supplier.approved'
          : 'supplier.rejected',
        command.actorId,
        command.actorRole,
        {
          decision: command.decision,
          reason: command.reason ?? null,
        },
      ),
    );

    if (command.decision === 'approve') {
      this.eventBus.publish(
        SupplierApprovedEvent.create(
          saved._id,
          saved.userId,
          saved.companyName,
        ),
      );
    } else {
      this.eventBus.publish(
        SupplierRejectedEvent.create(
          saved._id,
          saved.userId,
          saved.companyName,
          command.reason ?? null,
        ),
      );
    }

    return saved;
  }
}
