import { Inject } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { RemoveBundleItemCommand } from '../remove-bundle-item.command';
import type { IProductRepository } from '../../../domain/product.repository.interface';
import { PRODUCT_REPOSITORY } from '../../../domain/product.repository.interface';
import type { IProductBundleItemRepository } from '../../../domain/product-bundle-item.repository.interface';
import { PRODUCT_BUNDLE_ITEM_REPOSITORY } from '../../../domain/product-bundle-item.repository.interface';
import { ProductNotFoundException } from '../../../domain/product.exceptions';
import { ProductUpdatedEvent } from '../../../domain/events/product-updated.event';
import { buildUpdatedPayload } from '../../helpers/build-event-payload';

/**
 * Handles removal of a child product from a bundle.
 *
 * Loads the parent aggregate, verifies ownership, hard-deletes the bundle
 * item link from persistence, and publishes an update event.
 */
@CommandHandler(RemoveBundleItemCommand)
export class RemoveBundleItemHandler implements ICommandHandler<RemoveBundleItemCommand> {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: IProductRepository,
    @Inject(PRODUCT_BUNDLE_ITEM_REPOSITORY)
    private readonly bundleItemRepository: IProductBundleItemRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: RemoveBundleItemCommand) {
    const { productId, supplierId, childProductId } = command;

    const parent =
      await this.productRepository.findByPublicIdWithRelations(productId);
    if (!parent) throw new ProductNotFoundException(productId);
    parent.assertOwnedBy(supplierId);

    // Remove from persistence
    await this.bundleItemRepository.removeByParentAndChild(
      parent.internalId!,
      childProductId,
    );

    // Reload the aggregate for accurate event payload
    const saved =
      await this.productRepository.findByPublicIdWithRelations(productId);
    if (saved) {
      this.eventBus.publish(
        ProductUpdatedEvent.create(saved.id, buildUpdatedPayload(saved)),
      );
    }

    return { deleted: true };
  }
}
