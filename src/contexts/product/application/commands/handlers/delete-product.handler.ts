import { Inject } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { DeleteProductCommand } from '../delete-product.command';
import type { IProductRepository } from '../../../domain/product.repository.interface';
import { PRODUCT_REPOSITORY } from '../../../domain/product.repository.interface';
import { ProductNotFoundException } from '../../../domain/product.exceptions';
import { ProductDeletedEvent } from '../../../domain/events/product-deleted.event';

/**
 * Handles product deletion.
 *
 * Verifies ownership via the domain method, then soft-deletes.
 * Related variants and bundle items are cascade-soft-deleted.
 */
@CommandHandler(DeleteProductCommand)
export class DeleteProductHandler implements ICommandHandler<DeleteProductCommand> {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: IProductRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: DeleteProductCommand) {
    const { productId, supplierId } = command;

    const product = await this.productRepository.findByPublicId(productId);
    if (!product) throw new ProductNotFoundException(productId);
    product.assertOwnedBy(supplierId);

    await this.productRepository.remove(product.internalId!);

    this.eventBus.publish(ProductDeletedEvent.create(product.id));

    return { deleted: true };
  }
}
