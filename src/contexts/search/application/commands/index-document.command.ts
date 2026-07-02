export type { SearchProductDocument } from '../../domain/search-product-document.interface';

import type { SearchProductDocument } from '../../domain/search-product-document.interface';

export class IndexDocumentCommand {
  constructor(public readonly document: SearchProductDocument) {}
}
