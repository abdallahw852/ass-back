import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ElasticsearchService } from './infrastructure/elasticsearch.service';
import { IndexDocumentHandler } from './application/commands/index-document.handler';
import { DeleteDocumentHandler } from './application/commands/delete-document.handler';
import { ReindexAllProductsHandler } from './application/commands/reindex-all-products.handler';
import { SearchProductsHandler } from './application/queries/search-products.handler';
import { SuggestProductsHandler } from './application/queries/suggest-products.handler';
import { ImageSearchHandler } from './application/queries/image-search.handler';
import {
  SearchIndexerListener,
  SearchDeleteListener,
} from './presentation/event-listeners/search-indexer.listener';
import { SearchController } from './presentation/search.controller';
import { ProductOrmEntity } from '../product/infrastructure/persistence/product.orm-entity';
import { SupplierOrmEntity } from '../supplier/identity/infrastructure/persistence/supplier.orm-entity';
import { CategoryOrmEntity } from '../category/infrastructure/persistence/category.orm-entity';

@Module({
  imports: [
    CqrsModule,
    TypeOrmModule.forFeature(
      [ProductOrmEntity, SupplierOrmEntity, CategoryOrmEntity],
      'write',
    ),
  ],
  providers: [
    ElasticsearchService,
    IndexDocumentHandler,
    DeleteDocumentHandler,
    ReindexAllProductsHandler,
    SearchProductsHandler,
    SuggestProductsHandler,
    ImageSearchHandler,
    SearchIndexerListener,
    SearchDeleteListener,
  ],
  controllers: [SearchController],
})
export class SearchModule {}
