import { Inject } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { UpdateProductStatusCommand } from '../update-product-status.command';
import type { IProductRepository } from '../../../domain/product.repository.interface';
import { PRODUCT_REPOSITORY } from '../../../domain/product.repository.interface';
import { ProductNotFoundException } from '../../../domain/product.exceptions';
import { ProductStatus } from '../../../domain/enums/product-status.enum';
import { ProductUpdatedEvent } from '../../../domain/events/product-updated.event';
import { buildUpdatedPayload } from '../../helpers/build-event-payload';
import { ProductMapper } from '../../../infrastructure/mappers/product.mapper';

/**
 * Handles product status transitions.
 *
 * Loads the aggregate, verifies ownership, applies the status
 * change via the domain method, persists, and publishes an event.
 */
@CommandHandler(UpdateProductStatusCommand)
export class UpdateProductStatusHandler implements ICommandHandler<UpdateProductStatusCommand> {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: IProductRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: UpdateProductStatusCommand) {
    const { productId, supplierId, status } = command;

    const product =
      await this.productRepository.findByPublicIdWithRelations(productId);
    if (!product) throw new ProductNotFoundException(productId);
    product.assertOwnedBy(supplierId);

    product.changeStatus(status as ProductStatus);
    const saved = await this.productRepository.update(product);

    this.eventBus.publish(
      ProductUpdatedEvent.create(saved.id, buildUpdatedPayload(saved)),
    );

    return { product: ProductMapper.toResponse(saved) };
  }
}
