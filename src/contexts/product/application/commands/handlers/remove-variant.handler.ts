import { Inject } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { RemoveVariantCommand } from '../remove-variant.command';
import type { IProductRepository } from '../../../domain/product.repository.interface';
import { PRODUCT_REPOSITORY } from '../../../domain/product.repository.interface';
import type { IProductVariantRepository } from '../../../domain/product-variant.repository.interface';
import { PRODUCT_VARIANT_REPOSITORY } from '../../../domain/product-variant.repository.interface';
import {
  ProductNotFoundException,
  ProductVariantNotFoundException,
} from '../../../domain/product.exceptions';
import { ProductUpdatedEvent } from '../../../domain/events/product-updated.event';
import { buildUpdatedPayload } from '../../helpers/build-event-payload';

/**
 * Handles variant removal.
 *
 * Resolves the variant to find its parent, loads the aggregate,
 * verifies ownership, removes the variant from the aggregate,
 * hard-deletes it from persistence, and publishes an event.
 */
@CommandHandler(RemoveVariantCommand)
export class RemoveVariantHandler implements ICommandHandler<RemoveVariantCommand> {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: IProductRepository,
    @Inject(PRODUCT_VARIANT_REPOSITORY)
    private readonly variantRepository: IProductVariantRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: RemoveVariantCommand) {
    const { variantId, supplierId } = command;

    const variant = await this.variantRepository.findByPublicId(variantId);
    if (!variant) throw new ProductVariantNotFoundException(variantId);

    const product = await this.productRepository.findByInternalIdWithRelations(
      variant.productId!,
    );
    if (!product) throw new ProductNotFoundException(variantId);
    product.assertOwnedBy(supplierId);

    // Remove from the aggregate
    product.removeVariant(variantId);

    // Delete from persistence and save the updated aggregate
    await this.variantRepository.remove(variant.internalId!);
    const saved = await this.productRepository.update(product);

    this.eventBus.publish(
      ProductUpdatedEvent.create(saved.id, buildUpdatedPayload(saved)),
    );

    return { deleted: true };
  }
}
