import { BadRequestException, Inject } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { CreateProductCommand } from '../create-product.command';
import { Product } from '../../../domain/product.entity';
import type { IProductRepository } from '../../../domain/product.repository.interface';
import { PRODUCT_REPOSITORY } from '../../../domain/product.repository.interface';
import type { ICategoryRepository } from '../../../../category/domain/category.repository.interface';
import { CATEGORY_REPOSITORY } from '../../../../category/domain/category.repository.interface';
import { ProductCreatedEvent } from '../../../domain/events/product-created.event';
import {
  ProductNotFoundException,
  DuplicateSkuException,
  InvalidCategoryException,
  VariantsNotSupportedException,
  BookingFieldsNotSupportedException,
  DigitalFieldsNotSupportedException,
} from '../../../domain/product.exceptions';
import { buildCreatedPayload } from '../../helpers/build-event-payload';
import { ProductMapper } from '../../../infrastructure/mappers/product.mapper';
import { QuotaService } from '../../../../entitlement/infrastructure/quota.service';
import { ENTITLEMENT_SERVICE } from '../../../../entitlement/domain/entitlement.service.interface';
import type { IEntitlementService } from '../../../../entitlement/domain/entitlement.service.interface';

/**
 * Handles product creation.
 *
 * Builds a domain aggregate via {@link Product.create}, persists it,
 * and publishes a {@link ProductCreatedEvent}.
 */
@CommandHandler(CreateProductCommand)
export class CreateProductHandler implements ICommandHandler<CreateProductCommand> {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: IProductRepository,
    @Inject(CATEGORY_REPOSITORY)
    private readonly categoryRepository: ICategoryRepository,
    private readonly eventBus: EventBus,
    private readonly quotaService: QuotaService,
    @Inject(ENTITLEMENT_SERVICE)
    private readonly entitlementService: IEntitlementService,
  ) {}

  async execute(command: CreateProductCommand) {
    const { supplierId, input } = command;

    // Enforce max_products quota
    const productLimit = await this.entitlementService.getLimit(
      supplierId,
      'max_products',
    );
    const productCount =
      await this.productRepository.countActiveBySupplierId(supplierId);
    this.quotaService.assertWithinQuota(
      supplierId,
      'max_products',
      productCount,
      productLimit,
    );

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

    const product = Product.create({ supplierId, ...input });

    const type = product.type;

    // Type-specific gating — variants
    if (input.variants?.length && !type.supportsVariants()) {
      throw new VariantsNotSupportedException(type.value);
    }

    // Type-specific gating — booking fields
    const hasBookingFields =
      input.bookingAvailableTime ||
      input.bookingAvailableDate ||
      input.bookingCapacity;
    if (hasBookingFields && !type.supportsBooking()) {
      throw new BookingFieldsNotSupportedException(type.value);
    }

    // Type-specific gating — digital file fields
    const hasDigitalFields =
      input.digitalFileUrl || input.digitalFileType || input.digitalFileSize;
    if (hasDigitalFields && !type.supportsDigitalFile()) {
      throw new DigitalFieldsNotSupportedException(type.value);
    }

    // Add inline variants
    if (input.variants?.length) {
      for (const v of input.variants) {
        product.addVariant(v);
      }
    }

    // Add inline bundle items
    if (input.bundleItems?.length) {
      if (!product.type.isBundle()) {
        throw new BadRequestException(
          'Only bundle products can have child items.',
        );
      }
      for (const childId of input.bundleItems) {
        const child = await this.productRepository.findByPublicId(childId);
        if (!child) throw new ProductNotFoundException(childId);
        product.addBundleItem(childId);
      }
    }

    let saved;
    try {
      saved = await this.productRepository.save(product);
    } catch (err) {
      if (
        typeof err === 'object' &&
        err !== null &&
        (err as Record<string, unknown>)['code'] === '23505' &&
        input.sku
      ) {
        throw new DuplicateSkuException(input.sku);
      }
      throw err;
    }

    this.eventBus.publish(
      ProductCreatedEvent.create(saved.id, buildCreatedPayload(saved)),
    );

    return { product: ProductMapper.toResponse(saved) };
  }
}
