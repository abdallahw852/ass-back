import { Inject } from '@nestjs/common';
import {
  CommandBus,
  CommandHandler,
  EventBus,
  ICommandHandler,
} from '@nestjs/cqrs';
import { ApproveOrRejectProductCommand } from '../approve-or-reject-product.command';
import type { IProductRepository } from '../../../domain/product.repository.interface';
import { PRODUCT_REPOSITORY } from '../../../domain/product.repository.interface';
import { ProductNotFoundException } from '../../../domain/product.exceptions';
import { AppendAuditEventCommand } from '../../../../audit-log/application/commands/append-audit-event.command';
import { ProductApprovedEvent } from '../../../domain/events/product-approved.event';
import { ProductRejectedEvent } from '../../../domain/events/product-rejected.event';
import { ProductUpdatedEvent } from '../../../domain/events/product-updated.event';
import { buildUpdatedPayload } from '../../helpers/build-event-payload';
import { ProductMapper } from '../../../infrastructure/mappers/product.mapper';

/**
 * Handles admin approve/reject decisions on products.
 *
 * Loads the product, applies the domain state transition, persists,
 * dispatches an audit event, and publishes the appropriate domain events
 * so downstream consumers stay in sync.
 */
@CommandHandler(ApproveOrRejectProductCommand)
export class ApproveOrRejectProductHandler implements ICommandHandler<ApproveOrRejectProductCommand> {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: IProductRepository,
    private readonly commandBus: CommandBus,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: ApproveOrRejectProductCommand) {
    const product = await this.productRepository.findByPublicIdWithRelations(
      command.productId,
    );
    if (!product) throw new ProductNotFoundException(command.productId);

    if (command.decision === 'approve') {
      product.approve(command.actorId);
    } else {
      product.reject(command.reason ?? 'No reason provided', command.actorId);
    }

    const saved = await this.productRepository.update(product);

    await this.commandBus.execute(
      new AppendAuditEventCommand(
        'product',
        saved.id,
        command.decision === 'approve'
          ? 'product.approved'
          : 'product.rejected',
        command.actorId,
        command.actorRole,
        { decision: command.decision, reason: command.reason },
      ),
    );

    if (command.decision === 'approve') {
      this.eventBus.publish(
        ProductApprovedEvent.create(saved.id, saved.supplierId, saved.name),
      );
    } else {
      this.eventBus.publish(
        ProductRejectedEvent.create(
          saved.id,
          saved.supplierId,
          saved.name,
          command.reason ?? 'No reason provided',
        ),
      );
    }

    this.eventBus.publish(
      ProductUpdatedEvent.create(saved.id, buildUpdatedPayload(saved)),
    );

    return { product: ProductMapper.toResponse(saved) };
  }
}
