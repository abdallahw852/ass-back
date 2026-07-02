import type { Provider } from '@nestjs/common';
import { CreateProductHandler } from './create-product.handler';
import { UpdateProductHandler } from './update-product.handler';
import { DeleteProductHandler } from './delete-product.handler';
import { UpdateProductStatusHandler } from './update-product-status.handler';
import { SubmitProductForApprovalHandler } from './submit-product-for-approval.handler';
import { ApproveOrRejectProductHandler } from './approve-or-reject-product.handler';
import { UploadProductImagesHandler } from './upload-product-images.handler';
import { AddVariantHandler } from './add-variant.handler';
import { UpdateVariantHandler } from './update-variant.handler';
import { RemoveVariantHandler } from './remove-variant.handler';
import { AddBundleItemHandler } from './add-bundle-item.handler';
import { RemoveBundleItemHandler } from './remove-bundle-item.handler';
import { SetPricingTiersHandler } from './set-pricing-tiers.handler';

export * from './create-product.handler';
export * from './update-product.handler';
export * from './delete-product.handler';
export * from './update-product-status.handler';
export * from './submit-product-for-approval.handler';
export * from './approve-or-reject-product.handler';
export * from './upload-product-images.handler';
export * from './add-variant.handler';
export * from './update-variant.handler';
export * from './remove-variant.handler';
export * from './add-bundle-item.handler';
export * from './remove-bundle-item.handler';
export * from './set-pricing-tiers.handler';

export const CommandHandlers: Provider[] = [
  CreateProductHandler,
  UpdateProductHandler,
  DeleteProductHandler,
  UpdateProductStatusHandler,
  SubmitProductForApprovalHandler,
  ApproveOrRejectProductHandler,
  UploadProductImagesHandler,
  AddVariantHandler,
  UpdateVariantHandler,
  RemoveVariantHandler,
  AddBundleItemHandler,
  RemoveBundleItemHandler,
  SetPricingTiersHandler,
];
