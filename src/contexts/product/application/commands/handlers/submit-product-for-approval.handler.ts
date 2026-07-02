import { Inject } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { SubmitProductForApprovalCommand } from '../submit-product-for-approval.command';
import type { IProductRepository } from '../../../domain/product.repository.interface';
import { PRODUCT_REPOSITORY } from '../../../domain/product.repository.interface';
import { ProductNotFoundException } from '../../../domain/product.exceptions';
import { ProductUpdatedEvent } from '../../../domain/events/product-updated.event';
import { buildUpdatedPayload } from '../../helpers/build-event-payload';
import { ProductMapper } from '../../../infrastructure/mappers/product.mapper';

/**
 * Handles the supplier-initiated submit-for-approval workflow.
 *
 * Loads the product, verifies ownership, calls the domain method
 * `submitForApproval()`, persists, and publishes a ProductUpdatedEvent
 * so downstream consumers (e.g. Elasticsearch) stay in sync.
 */
@CommandHandler(SubmitProductForApprovalCommand)
export class SubmitProductForApprovalHandler implements ICommandHandler<SubmitProductForApprovalCommand> {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: IProductRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: SubmitProductForApprovalCommand) {
    const product = await this.productRepository.findByPublicIdWithRelations(
      command.productId,
    );
    if (!product) throw new ProductNotFoundException(command.productId);
    product.assertOwnedBy(command.supplierId);

    product.submitForApproval();
    const saved = await this.productRepository.update(product);

    this.eventBus.publish(
      ProductUpdatedEvent.create(saved.id, buildUpdatedPayload(saved)),
    );

    return { product: ProductMapper.toResponse(saved) };
  }
}
