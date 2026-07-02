import type { Provider } from '@nestjs/common';
import { GetProductHandler } from './get-product.handler';
import { ListProductsHandler } from './list-products.handler';
import { GetProductVariantsHandler } from './get-product-variants.handler';
import { ListProductsForAdminHandler } from './list-products-for-admin.handler';

export * from './get-product.handler';
export * from './list-products.handler';
export * from './get-product-variants.handler';
export * from './list-products-for-admin.handler';

export const QueryHandlers: Provider[] = [
  GetProductHandler,
  ListProductsHandler,
  GetProductVariantsHandler,
  ListProductsForAdminHandler,
];
