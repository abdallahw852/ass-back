import { ConfigService } from '@nestjs/config';
import { ElasticsearchService } from './elasticsearch.service';
import type { SearchFilters } from '../domain/search.types';

/**
 * Unit tests for ElasticsearchService.buildSearchBody().
 *
 * The method is a pure data-transformation function — no ES client connection
 * required. All tests run without network or infrastructure dependencies.
 */

function makeService(): ElasticsearchService {
  const config = {
    get: (key: string) => {
      if (key === 'NODE_ENV') return 'test';
      return undefined;
    },
  } as unknown as ConfigService;

  return new ElasticsearchService(config);
}

describe('ElasticsearchService.buildSearchBody()', () => {
  const svc = makeService();

  // ── Status filter always present ───────────────────────────────────────────

  it('always filters to status:active', () => {
    const body = svc.buildSearchBody({}) as Record<string, unknown>;
    // Without a text query the top-level query IS the bool clause.
    const query = body['query'] as {
      bool: { must: object[]; filter: object[] };
    };
    expect(query.bool.must).toContainEqual({ term: { status: 'active' } });
  });

  // ── Text query structure ────────────────────────────────────────────────────

  it('wraps text query in function_score when q is provided', () => {
    const body = svc.buildSearchBody({ q: 'laptop' }) as Record<
      string,
      unknown
    >;
    const query = body['query'] as Record<string, unknown>;
    expect(query).toHaveProperty('function_score');
  });

  it('does NOT use function_score when q is absent', () => {
    const body = svc.buildSearchBody({}) as Record<string, unknown>;
    const query = body['query'] as Record<string, unknown>;
    expect(query).not.toHaveProperty('function_score');
    expect(query).toHaveProperty('bool');
  });

  it('includes phrase, best_fields, and bool_prefix should-clauses for text query', () => {
    const body = svc.buildSearchBody({ q: 'mobile phone' }) as Record<
      string,
      unknown
    >;
    const fs = body['query'] as {
      function_score: { query: { bool: { must: object[] } } };
    };
    const mustClauses = fs.function_score.query.bool.must;

    // The second must-clause is the bool.should bundle.
    const shouldBundle = mustClauses.find(
      (c): c is { bool: { should: object[] } } =>
        typeof c === 'object' && c !== null && 'bool' in c,
    );
    expect(shouldBundle).toBeDefined();
    const shouldClauses = shouldBundle!.bool.should;

    // Should contain a phrase match
    expect(
      shouldClauses.some(
        (c) =>
          typeof c === 'object' &&
          c !== null &&
          'multi_match' in c &&
          (c as { multi_match: { type: string } }).multi_match.type ===
            'phrase',
      ),
    ).toBe(true);

    // Should contain a best_fields fuzzy match
    expect(
      shouldClauses.some(
        (c) =>
          typeof c === 'object' &&
          c !== null &&
          'multi_match' in c &&
          (c as { multi_match: { type: string } }).multi_match.type ===
            'best_fields',
      ),
    ).toBe(true);

    // Should contain a bool_prefix (prefix / partial) match
    expect(
      shouldClauses.some(
        (c) =>
          typeof c === 'object' &&
          c !== null &&
          'multi_match' in c &&
          (c as { multi_match: { type: string } }).multi_match.type ===
            'bool_prefix',
      ),
    ).toBe(true);
  });

  it('phrase clause targets nameEn and nameAr with high boosts', () => {
    const body = svc.buildSearchBody({ q: 'cable' }) as Record<string, unknown>;
    const fs = body['query'] as {
      function_score: { query: { bool: { must: object[] } } };
    };
    const shouldBundle = fs.function_score.query.bool.must.find(
      (c): c is { bool: { should: object[] } } =>
        typeof c === 'object' && c !== null && 'bool' in c,
    );
    const phraseClause = shouldBundle!.bool.should.find(
      (c): c is { multi_match: { type: string; fields: string[] } } =>
        typeof c === 'object' &&
        c !== null &&
        'multi_match' in c &&
        (c as { multi_match: { type: string } }).multi_match.type === 'phrase',
    );
    expect(phraseClause!.multi_match.fields).toContain('nameEn^4');
    expect(phraseClause!.multi_match.fields).toContain('nameAr^4');
  });

  // ── function_score signals ─────────────────────────────────────────────────

  it('function_score includes a verified-supplier weight boost', () => {
    const body = svc.buildSearchBody({ q: 'phone' }) as Record<string, unknown>;
    const fs = body['query'] as {
      function_score: { functions: object[] };
    };
    const hasVerifiedBoost = fs.function_score.functions.some(
      (fn) =>
        typeof fn === 'object' &&
        fn !== null &&
        'filter' in fn &&
        JSON.stringify(fn).includes('supplierIsVerified'),
    );
    expect(hasVerifiedBoost).toBe(true);
  });

  it('function_score includes a viewCount field_value_factor', () => {
    const body = svc.buildSearchBody({ q: 'phone' }) as Record<string, unknown>;
    const fs = body['query'] as {
      function_score: { functions: object[] };
    };
    const hasViewCount = fs.function_score.functions.some(
      (fn) =>
        typeof fn === 'object' &&
        fn !== null &&
        'field_value_factor' in fn &&
        JSON.stringify(fn).includes('viewCount'),
    );
    expect(hasViewCount).toBe(true);
  });

  // ── Filters ────────────────────────────────────────────────────────────────

  it('applies category, country, supplierType, and price filters to bool.filter', () => {
    const filters: SearchFilters = {
      categoryIds: ['cat-1'],
      countries: ['AE'],
      supplierTypes: ['manufacturer'],
      priceMin: 10,
      priceMax: 500,
    };
    const body = svc.buildSearchBody(filters) as Record<string, unknown>;
    const boolFilter = (body['query'] as { bool: { filter: object[] } }).bool
      .filter;

    expect(boolFilter).toContainEqual({
      terms: { categoryPath: ['cat-1'] },
    });
    expect(boolFilter).toContainEqual({ terms: { supplierCountry: ['AE'] } });
    expect(boolFilter).toContainEqual({
      terms: { supplierType: ['manufacturer'] },
    });
    expect(boolFilter).toContainEqual({
      range: { costPrice: { gte: 10, lte: 500 } },
    });
  });

  it('applies verifiedOnly filter', () => {
    const body = svc.buildSearchBody({ verifiedOnly: true }) as Record<
      string,
      unknown
    >;
    const boolFilter = (body['query'] as { bool: { filter: object[] } }).bool
      .filter;
    expect(boolFilter).toContainEqual({ term: { supplierIsVerified: true } });
  });

  // ── Sorting ────────────────────────────────────────────────────────────────

  it('default sort is _score then createdAt', () => {
    const body = svc.buildSearchBody({ q: 'test' }) as Record<string, unknown>;
    expect(body['sort']).toEqual(['_score:desc', 'createdAt:desc']);
  });

  it('explicit price_asc sort overrides scoring', () => {
    const body = svc.buildSearchBody({
      q: 'test',
      sort: 'price_asc',
    }) as Record<string, unknown>;
    expect(body['sort']).toEqual(['costPrice:asc']);
  });

  it('newest sort works without a query term', () => {
    const body = svc.buildSearchBody({ sort: 'newest' }) as Record<
      string,
      unknown
    >;
    expect(body['sort']).toEqual(['createdAt:desc']);
  });

  // ── Pagination ─────────────────────────────────────────────────────────────

  it('defaults page=1 and limit=24', () => {
    const body = svc.buildSearchBody({}) as Record<string, unknown>;
    expect(body['from']).toBe(0);
    expect(body['size']).toBe(24);
  });

  it('computes correct from for page 3 with limit 10', () => {
    const body = svc.buildSearchBody({ page: 3, limit: 10 }) as Record<
      string,
      unknown
    >;
    expect(body['from']).toBe(20);
    expect(body['size']).toBe(10);
  });

  // ── Facets ─────────────────────────────────────────────────────────────────

  it('includes aggregations when facets is not false', () => {
    const body = svc.buildSearchBody({ facets: true }) as Record<
      string,
      unknown
    >;
    expect(body['aggs']).toBeDefined();
  });

  it('excludes aggregations when facets=false', () => {
    const body = svc.buildSearchBody({ facets: false }) as Record<
      string,
      unknown
    >;
    expect(body['aggs']).toBeUndefined();
  });

  // ── Whitespace query ───────────────────────────────────────────────────────

  it('treats whitespace-only q as no text query', () => {
    const body = svc.buildSearchBody({ q: '   ' }) as Record<string, unknown>;
    // No function_score because q.trim() is empty.
    expect(body['query']).not.toHaveProperty('function_score');
  });
});
