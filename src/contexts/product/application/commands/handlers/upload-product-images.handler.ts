import { Inject } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { UploadProductImagesCommand } from '../upload-product-images.command';
import type { IProductRepository } from '../../../domain/product.repository.interface';
import { PRODUCT_REPOSITORY } from '../../../domain/product.repository.interface';
import { ProductNotFoundException } from '../../../domain/product.exceptions';
import { ProductUpdatedEvent } from '../../../domain/events/product-updated.event';
import { buildUpdatedPayload } from '../../helpers/build-event-payload';
import { ProductMapper } from '../../../infrastructure/mappers/product.mapper';

/**
 * Handles uploading images to a product.
 *
 * Loads the aggregate, verifies ownership, appends images via the
 * domain method (which enforces the max-images invariant), persists,
 * and publishes an event.
 */
@CommandHandler(UploadProductImagesCommand)
export class UploadProductImagesHandler implements ICommandHandler<UploadProductImagesCommand> {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: IProductRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: UploadProductImagesCommand) {
    const { productId, supplierId, imageUrls } = command;

    const product =
      await this.productRepository.findByPublicIdWithRelations(productId);
    if (!product) throw new ProductNotFoundException(productId);
    product.assertOwnedBy(supplierId);

    product.addImages(imageUrls);
    const saved = await this.productRepository.update(product);

    this.eventBus.publish(
      ProductUpdatedEvent.create(saved.id, buildUpdatedPayload(saved)),
    );

    return { product: ProductMapper.toResponse(saved) };
  }
}
