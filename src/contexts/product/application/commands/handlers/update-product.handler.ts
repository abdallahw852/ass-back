import { BadRequestException, Inject } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { DataSource } from 'typeorm';
import { getDataSourceToken } from '@nestjs/typeorm';
import { ProductMapper } from '../../../infrastructure/mappers/product.mapper';
import { UpdateProductCommand } from '../update-product.command';
import type { IProductRepository } from '../../../domain/product.repository.interface';
import { PRODUCT_REPOSITORY } from '../../../domain/product.repository.interface';
import type { IProductVariantRepository } from '../../../domain/product-variant.repository.interface';
import { PRODUCT_VARIANT_REPOSITORY } from '../../../domain/product-variant.repository.interface';
import type { IProductBundleItemRepository } from '../../../domain/product-bundle-item.repository.interface';
import { PRODUCT_BUNDLE_ITEM_REPOSITORY } from '../../../domain/product-bundle-item.repository.interface';
import type { ICategoryRepository } from '../../../../category/domain/category.repository.interface';
import { CATEGORY_REPOSITORY } from '../../../../category/domain/category.repository.interface';
import {
  ProductNotFoundException,
  DuplicateSkuException,
  InvalidCategoryException,
} from '../../../domain/product.exceptions';
import { ProductStatus } from '../../../domain/enums/product-status.enum';
import { ProductUpdatedEvent } from '../../../domain/events/product-updated.event';
import { buildUpdatedPayload } from '../../helpers/build-event-payload';

/**
 * Handles partial updates to an existing product.
 *
 * Loads the aggregate, verifies ownership via the domain method,
 * applies changes (including inline variant/bundle replacement),
 * persists, and publishes an update event.
 */
@CommandHandler(UpdateProductCommand)
export class UpdateProductHandler implements ICommandHandler<UpdateProductCommand> {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: IProductRepository,
    @Inject(PRODUCT_VARIANT_REPOSITORY)
    private readonly variantRepository: IProductVariantRepository,
    @Inject(PRODUCT_BUNDLE_ITEM_REPOSITORY)
    private readonly bundleItemRepository: IProductBundleItemRepository,
    @Inject(CATEGORY_REPOSITORY)
    private readonly categoryRepository: ICategoryRepository,
    @Inject(getDataSourceToken('write'))
    private readonly dataSource: DataSource,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: UpdateProductCommand) {
    const { productId, supplierId, input } = command;

    const product =
      await this.productRepository.findByPublicIdWithRelations(productId);
    if (!product) throw new ProductNotFoundException(productId);
    product.assertOwnedBy(supplierId);

    // Validate category and subcategory existence
    if (input.categoryId) {
      const category = await this.categoryRepository.findByPublicId(
        input.categoryId,
      );
      if (!category) throw new InvalidCategoryException(input.categoryId);
    }
    if (input.subcategoryId) {
      const subcat = await this.categoryRepository.findByPublicId(
        input.subcategoryId,
      );
      if (!subcat) throw new InvalidCategoryException(input.subcategoryId);
    }

    // Apply scalar field updates
    product.updateDetails(input);

    // Status change — evaluated before the re-review revert so that e.g.
    // deactivate() can run from ACTIVE before revertToPendingForReview() fires.
    if (input.status !== undefined) {
      product.changeStatus(input.status as ProductStatus);
    }

    // If the product was already live (or just moved to INACTIVE), any edit
    // must go back through admin review before it is visible again.
    product.revertToPendingForReview();

    // Validate in-memory first (can throw before any DB mutation)
    if (input.variants !== undefined) {
      product.replaceVariants(input.variants);
    }
    // Capture before update() returns a reconstituted aggregate (which resets this list)
    const removedVariantInternalIds = product.removedVariantInternalIds;
    if (input.bundleItems !== undefined) {
      if (!product.type.isBundle()) {
        throw new BadRequestException(
          'Only bundle products can have child items.',
        );
      }
      for (const childId of input.bundleItems) {
        const child = await this.productRepository.findByPublicId(childId);
        if (!child) throw new ProductNotFoundException(childId);
      }
      product.replaceBundleItems(input.bundleItems);
    }

    // Wrap DB mutations in a transaction so deletes + save are atomic
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let saved;
    try {
      if (input.variants !== undefined) {
        for (const id of product.removedVariantInternalIds) {
          await this.variantRepository.remove(id);
        }
      }
      if (input.bundleItems !== undefined) {
        await this.bundleItemRepository.removeByParentProductId(
          product.internalId!,
        );
      }

      saved = await this.productRepository.update(product);
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      if (
        typeof error === 'object' &&
        error !== null &&
        (error as Record<string, unknown>)['code'] === '23505' &&
        input.sku
      ) {
        throw new DuplicateSkuException(input.sku);
      }
      throw error;
    } finally {
      await queryRunner.release();
    }

    this.eventBus.publish(
      ProductUpdatedEvent.create(
        saved.id,
        buildUpdatedPayload(saved, removedVariantInternalIds),
      ),
    );

    return { product: ProductMapper.toResponse(saved) };
  }
}
