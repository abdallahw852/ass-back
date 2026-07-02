import { ListCatalogProductsHandler } from './list-catalog-products.handler';
import { GetCatalogProductHandler } from './get-catalog-product.handler';
import { GetHomepageSectionsHandler } from './get-homepage-sections.handler';

export const CatalogQueryHandlers = [
  ListCatalogProductsHandler,
  GetCatalogProductHandler,
  GetHomepageSectionsHandler,
];
