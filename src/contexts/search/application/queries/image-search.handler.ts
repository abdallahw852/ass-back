import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { ImageSearchQuery } from './image-search.query';

// pgvector image similarity search — requires embedding generation model.
// Returns empty until a vector embedding service is integrated.
@QueryHandler(ImageSearchQuery)
export class ImageSearchHandler implements IQueryHandler<ImageSearchQuery> {
  execute(
    _query: ImageSearchQuery,
  ): Promise<{ items: unknown[]; total: number }> {
    return Promise.resolve({ items: [], total: 0 });
  }
}
