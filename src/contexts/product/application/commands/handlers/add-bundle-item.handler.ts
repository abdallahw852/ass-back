import { BadRequestException, Inject } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { AddBundleItemCommand } from '../add-bundle-item.command';
import type { IProductRepository } from '../../../domain/product.repository.interface';
import { PRODUCT_REPOSITORY } from '../../../domain/product.repository.interface';
import { ProductNotFoundException } from '../../../domain/product.exceptions';
import { ProductUpdatedEvent } from '../../../domain/events/product-updated.event';
import { buildUpdatedPayload } from '../../helpers/build-event-payload';

/**
 * Handles adding a child product to a bundle.
 *
 * Loads the parent aggregate with relations, verifies ownership and
 * bundle type, validates the child product exists, then delegates
 * to the domain's {@link Product.addBundleItem} method which
 * enforces the self-reference invariant.
 */
@CommandHandler(AddBundleItemCommand)
export class AddBundleItemHandler implements ICommandHandler<AddBundleItemCommand> {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: IProductRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: AddBundleItemCommand) {
    const { productId, supplierId, childProductId } = command;

    const parent =
      await this.productRepository.findByPublicIdWithRelations(productId);
    if (!parent) throw new ProductNotFoundException(productId);
    parent.assertOwnedBy(supplierId);

    if (!parent.type.isBundle()) {
      throw new BadRequestException(
        'Only bundle products can have child items.',
      );
    }

    // Verify the child product exists
    const child = await this.productRepository.findByPublicId(childProductId);
    if (!child) throw new ProductNotFoundException(childProductId);

    // Domain method enforces self-reference guard
    const bundleItem = parent.addBundleItem(childProductId);
    const saved = await this.productRepository.update(parent);

    this.eventBus.publish(
      ProductUpdatedEvent.create(saved.id, buildUpdatedPayload(saved)),
    );

    return {
      bundleItem: {
        _id: bundleItem.id,
        childProductId: bundleItem.childProductId,
      },
    };
  }
}
