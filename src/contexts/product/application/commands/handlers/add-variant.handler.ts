import { Inject } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { AddVariantCommand } from '../add-variant.command';
import { ProductMapper } from '../../../infrastructure/mappers/product.mapper';
import type { IProductRepository } from '../../../domain/product.repository.interface';
import { PRODUCT_REPOSITORY } from '../../../domain/product.repository.interface';
import {
  ProductNotFoundException,
  VariantsNotSupportedException,
} from '../../../domain/product.exceptions';
import { ProductUpdatedEvent } from '../../../domain/events/product-updated.event';
import { buildUpdatedPayload } from '../../helpers/build-event-payload';

/**
 * Handles adding a new variant to a product.
 *
 * Loads the aggregate with relations, verifies ownership, adds the
 * variant via the domain method (which enforces duplicate checks),
 * persists the whole aggregate, and publishes an event.
 */
@CommandHandler(AddVariantCommand)
export class AddVariantHandler implements ICommandHandler<AddVariantCommand> {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: IProductRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: AddVariantCommand) {
    const { productId, supplierId, input } = command;

    const product =
      await this.productRepository.findByPublicIdWithRelations(productId);
    if (!product) throw new ProductNotFoundException(productId);
    product.assertOwnedBy(supplierId);

    if (!product.type.supportsVariants()) {
      throw new VariantsNotSupportedException(product.type.value);
    }

    const variant = product.addVariant(input);
    const saved = await this.productRepository.update(product);

    this.eventBus.publish(
      ProductUpdatedEvent.create(saved.id, buildUpdatedPayload(saved)),
    );

    return { variant: ProductMapper.variantToResponse(variant) };
  }
}
