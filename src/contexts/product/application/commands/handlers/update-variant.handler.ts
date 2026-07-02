import { Inject } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { UpdateVariantCommand } from '../update-variant.command';
import { ProductMapper } from '../../../infrastructure/mappers/product.mapper';
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
 * Handles partial updates to a product variant.
 *
 * Resolves the variant to find its parent product, loads the full
 * aggregate, verifies ownership, applies changes via the aggregate's
 * `updateVariant` method, persists, and publishes an event.
 */
@CommandHandler(UpdateVariantCommand)
export class UpdateVariantHandler implements ICommandHandler<UpdateVariantCommand> {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: IProductRepository,
    @Inject(PRODUCT_VARIANT_REPOSITORY)
    private readonly variantRepository: IProductVariantRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: UpdateVariantCommand) {
    const { variantId, supplierId, input } = command;

    // Look up the variant to find its parent product's internal ID
    const variant = await this.variantRepository.findByPublicId(variantId);
    if (!variant) throw new ProductVariantNotFoundException(variantId);

    // Load the full aggregate via the variant's parent FK
    const product = await this.productRepository.findByInternalIdWithRelations(
      variant.productId!,
    );
    if (!product) throw new ProductNotFoundException(variantId);
    product.assertOwnedBy(supplierId);

    // Update the variant through the aggregate
    const updated = product.updateVariant(variantId, input);
    if (!updated) throw new ProductVariantNotFoundException(variantId);

    const saved = await this.productRepository.update(product);

    this.eventBus.publish(
      ProductUpdatedEvent.create(saved.id, buildUpdatedPayload(saved)),
    );

    return { variant: ProductMapper.variantToResponse(updated) };
  }
}
