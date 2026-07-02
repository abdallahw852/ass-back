import { SearchProductsHandler } from './search-products.handler';
import { SearchProductsQuery } from './search-products.query';
import type { ElasticsearchService } from '../../infrastructure/elasticsearch.service';
import type { SearchProductDocument } from '../../domain/search-product-document.interface';

const makeDoc = (
  overrides: Partial<SearchProductDocument> = {},
): SearchProductDocument => ({
  id: 'uuid-1',
  nameEn: 'Test Product',
  nameAr: 'منتج اختبار',
  descriptionEn: 'A test product',
  descriptionAr: null,
  costPrice: 100,
  discountedPrice: null,
  moq: 10,
  viewCount: 0,
  supplierId: 1,
  supplierCountry: 'AE',
  supplierType: 'manufacturer',
  supplierIsVerified: true,
  categoryId: 'cat-uuid',
  categoryPath: ['cat-uuid'],
  currency: 'SAR',
  condition: 'new',
  status: 'active',
  createdAt: new Date('2024-01-01'),
  ...overrides,
});

class FakeElasticsearchService {
  private _results: {
    items: SearchProductDocument[];
    total: number;
    facets: Record<string, unknown>;
  } = {
    items: [],
    total: 0,
    facets: {},
  };

  seed(results: {
    items: SearchProductDocument[];
    total: number;
    facets?: Record<string, unknown>;
  }) {
    this._results = { facets: {}, ...results };
  }

  search() {
    return Promise.resolve(this._results);
  }

  suggest() {
    return Promise.resolve([]);
  }
}

describe('SearchProductsHandler', () => {
  const makeHandler = () => {
    const es = new FakeElasticsearchService();
    const handler = new SearchProductsHandler(
      es as unknown as ElasticsearchService,
    );
    return { es, handler };
  };

  it('returns items, total, page, limit and facets', async () => {
    const { es, handler } = makeHandler();
    es.seed({ items: [makeDoc()], total: 1 });

    const result = await handler.execute(
      new SearchProductsQuery({ q: 'test', page: 1, limit: 12 }),
    );

    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(12);
    expect(result.facets).toBeDefined();
  });

  it('defaults page to 1 and limit to 24 when not provided', async () => {
    const { handler } = makeHandler();

    const result = await handler.execute(new SearchProductsQuery({}));

    expect(result.page).toBe(1);
    expect(result.limit).toBe(24);
  });

  it('returns empty items and total 0 when no results', async () => {
    const { handler } = makeHandler();

    const result = await handler.execute(
      new SearchProductsQuery({ q: 'nonexistent' }),
    );

    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it('passes filters including sort through to ES service', async () => {
    const { es, handler } = makeHandler();
    const searchSpy = jest.spyOn(es, 'search');

    await handler.execute(
      new SearchProductsQuery({
        q: 'cable',
        sort: 'price_asc',
        countries: ['AE', 'EG'],
        priceMin: 10,
        priceMax: 500,
      }),
    );

    expect(searchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        q: 'cable',
        sort: 'price_asc',
        countries: ['AE', 'EG'],
        priceMin: 10,
        priceMax: 500,
      }),
    );
  });
});
