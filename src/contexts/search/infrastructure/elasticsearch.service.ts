import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@elastic/elasticsearch';
import type { SearchProductDocument } from '../domain/search-product-document.interface';
import type { SearchFilters } from '../domain/search.types';
import { EN_SYNONYMS, AR_SYNONYMS } from './synonyms';

// Bump this constant (+ the alias logic below) whenever the index mapping changes.
const INDEX_NAME = 'products_v4';
const ALIAS_NAME = 'products';

@Injectable()
export class ElasticsearchService implements OnModuleInit {
  private readonly logger = new Logger(ElasticsearchService.name);
  private client: Client;

  constructor(private readonly config: ConfigService) {
    const isProd = this.config.get<string>('NODE_ENV') === 'production';
    const node = this.config.get<string>('ELASTICSEARCH_NODE');
    const username = this.config.get<string>('ELASTICSEARCH_USERNAME');
    const password = this.config.get<string>('ELASTICSEARCH_PASSWORD');

    if (isProd && (!node || !username || !password)) {
      throw new Error(
        'ELASTICSEARCH_NODE, ELASTICSEARCH_USERNAME, and ELASTICSEARCH_PASSWORD must be set in production',
      );
    }

    this.client = new Client({
      node: node ?? 'http://localhost:9200',
      auth: {
        username: username ?? 'elastic',
        password: password ?? 'changeme',
      },
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      const exists = await this.client.indices.exists({ index: INDEX_NAME });
      if (!exists) {
        await this.client.indices.create({
          index: INDEX_NAME,
          settings: {
            number_of_shards: 1,
            number_of_replicas: 0,
            analysis: {
              filter: {
                english_stop: {
                  type: 'stop',
                  stopwords: '_english_',
                },
                english_stemmer: {
                  type: 'stemmer',
                  language: 'english',
                },
                arabic_stop: {
                  type: 'stop',
                  stopwords: '_arabic_',
                },
                arabic_stemmer: {
                  type: 'stemmer',
                  language: 'arabic',
                },
                en_synonyms: {
                  type: 'synonym_graph',
                  synonyms: EN_SYNONYMS,
                  // updateable: true allows synonym expansion without reindex.
                  updateable: true,
                },
                ar_synonyms: {
                  type: 'synonym_graph',
                  synonyms: AR_SYNONYMS,
                  updateable: true,
                },
              },
              analyzer: {
                // English index-time: tokenize + lowercase + asciifolding + stop + stem.
                en_index: {
                  type: 'custom',
                  tokenizer: 'standard',
                  filter: [
                    'lowercase',
                    'asciifolding',
                    'english_stop',
                    'english_stemmer',
                  ],
                },
                // English search-time: same as en_index + synonym expansion.
                en_search: {
                  type: 'custom',
                  tokenizer: 'standard',
                  filter: [
                    'lowercase',
                    'asciifolding',
                    'english_stop',
                    'english_stemmer',
                    'en_synonyms',
                  ],
                },
                // Arabic index-time: explicit mirror of the built-in `arabic`
                // analyzer so index and search filters stay in sync.
                ar_index: {
                  type: 'custom',
                  tokenizer: 'standard',
                  filter: [
                    'lowercase',
                    'decimal_digit',
                    'arabic_normalization',
                    'arabic_stop',
                    'arabic_stemmer',
                  ],
                },
                // Arabic search-time: ar_index filters + synonym expansion.
                ar_search: {
                  type: 'custom',
                  tokenizer: 'standard',
                  filter: [
                    'lowercase',
                    'decimal_digit',
                    'arabic_normalization',
                    'arabic_stop',
                    'arabic_stemmer',
                    'ar_synonyms',
                  ],
                },
              },
            },
          },
          mappings: {
            properties: {
              // Bilingual name fields — stemming + synonyms at search time
              nameEn: {
                type: 'text',
                analyzer: 'en_index',
                search_analyzer: 'en_search',
                fields: { keyword: { type: 'keyword' } },
              },
              nameAr: {
                type: 'text',
                analyzer: 'ar_index',
                search_analyzer: 'ar_search',
                fields: { keyword: { type: 'keyword' } },
              },
              // search_as_you_type generates sub-fields (_2gram, _3gram) used for
              // prefix/partial matching in both autocomplete and the main query.
              nameSuggest: { type: 'search_as_you_type' },
              // Bilingual description fields
              descriptionEn: {
                type: 'text',
                analyzer: 'en_index',
                search_analyzer: 'en_search',
              },
              descriptionAr: {
                type: 'text',
                analyzer: 'ar_index',
                search_analyzer: 'ar_search',
              },
              // Numeric / range filter fields
              costPrice: { type: 'double' },
              discountedPrice: { type: 'double' },
              moq: { type: 'integer' },
              viewCount: { type: 'integer' },
              // Keyword / facet fields
              supplierId: { type: 'integer' },
              supplierCountry: { type: 'keyword' },
              supplierType: { type: 'keyword' },
              supplierIsVerified: { type: 'boolean' },
              categoryId: { type: 'keyword' },
              categoryPath: { type: 'keyword' },
              currency: { type: 'keyword' },
              condition: { type: 'keyword' },
              status: { type: 'keyword' },
              // Date for newest sort
              createdAt: { type: 'date' },
            },
          },
        });
        this.logger.log(`Created index '${INDEX_NAME}'`);
      }

      // Ensure the alias points atomically to this index, removing stale pointers.
      await this.updateAlias();
    } catch (err) {
      this.logger.warn(`Elasticsearch not available: ${String(err)}`);
    }
  }

  /** Atomically switches the `products` alias to point at INDEX_NAME. */
  private async updateAlias(): Promise<void> {
    // Find any existing alias pointers (may include old index versions).
    let oldIndices: string[] = [];
    try {
      const aliasInfo = await this.client.indices.getAlias({
        name: ALIAS_NAME,
      });
      oldIndices = Object.keys(aliasInfo).filter((idx) => idx !== INDEX_NAME);
    } catch {
      // Alias doesn't exist yet — fine, we'll just add it.
    }

    const actions: object[] = oldIndices.map((idx) => ({
      remove: { index: idx, alias: ALIAS_NAME },
    }));
    actions.push({ add: { index: INDEX_NAME, alias: ALIAS_NAME } });

    await this.client.indices.updateAliases({ actions });
    this.logger.log(`Alias '${ALIAS_NAME}' → '${INDEX_NAME}'`);
  }

  async index(document: SearchProductDocument): Promise<boolean> {
    try {
      await this.client.index({
        index: INDEX_NAME,
        id: document.id,
        document: this.buildDoc(document),
      });
      return true;
    } catch (err) {
      this.logger.warn(
        `Failed to index product ${document.id}: ${(err as Error).message}`,
      );
      return false;
    }
  }

  async bulk(
    documents: SearchProductDocument[],
  ): Promise<{ indexed: number; failed: number }> {
    if (documents.length === 0) return { indexed: 0, failed: 0 };
    try {
      const operations = documents.flatMap((doc) => [
        { index: { _index: INDEX_NAME, _id: doc.id } },
        this.buildDoc(doc),
      ]);
      const result = await this.client.bulk({ operations });
      const failed = result.items.filter((item) => item.index?.error).length;
      if (failed > 0) {
        this.logger.warn(`Bulk index: ${failed} of ${documents.length} failed`);
      }
      return { indexed: documents.length - failed, failed };
    } catch (err) {
      this.logger.warn(`Bulk index failed: ${(err as Error).message}`);
      return { indexed: 0, failed: documents.length };
    }
  }

  private buildDoc(document: SearchProductDocument): Record<string, unknown> {
    return {
      nameEn: document.nameEn,
      nameAr: document.nameAr,
      nameSuggest: [document.nameEn, document.nameAr]
        .filter((v): v is string => v != null && v !== '')
        .join(' '),
      descriptionEn: document.descriptionEn,
      descriptionAr: document.descriptionAr,
      costPrice: document.costPrice,
      discountedPrice: document.discountedPrice,
      moq: document.moq,
      viewCount: document.viewCount ?? 0,
      supplierId: document.supplierId,
      supplierCountry: document.supplierCountry,
      supplierType: document.supplierType,
      supplierIsVerified: document.supplierIsVerified,
      categoryId: document.categoryId,
      categoryPath: document.categoryPath,
      currency: document.currency,
      condition: document.condition,
      status: document.status,
      createdAt: document.createdAt,
    };
  }

  async delete(productId: string): Promise<void> {
    try {
      await this.client.delete({ index: INDEX_NAME, id: productId });
    } catch (err) {
      this.logger.warn(
        `Failed to delete product ${productId}: ${(err as Error).message}`,
      );
    }
  }

  async search(filters: SearchFilters): Promise<{
    items: SearchProductDocument[];
    total: number;
    facets: Record<string, unknown>;
  }> {
    try {
      const body = this.buildSearchBody(filters);
      const result = await this.client.search<SearchProductDocument>(body);

      const hits = result.hits.hits;
      const total =
        typeof result.hits.total === 'number'
          ? result.hits.total
          : (result.hits.total?.value ?? 0);

      const facets = this.extractFacets(result.aggregations);

      return {
        items: hits.map((h) => h._source as SearchProductDocument),
        total,
        facets,
      };
    } catch (err) {
      this.logger.warn(`Search failed: ${(err as Error).message}`);
      return { items: [], total: 0, facets: {} };
    }
  }

  /**
   * Builds the full Elasticsearch request body for `search()`.
   * Extracted into a pure method so it can be unit-tested without a live cluster.
   */
  buildSearchBody(filters: SearchFilters): object {
    const must: object[] = [{ term: { status: 'active' } }];
    const filter: object[] = [];

    if (filters.q?.trim()) {
      const q = filters.q.trim();

      // Three-clause should bundle:
      //  1. Exact phrase — highest signal
      //  2. Per-term fuzzy match — catches typos (AUTO fuzziness, min 1 prefix)
      //  3. Prefix / partial — catches incomplete words ("lap" → "laptop")
      // Synonym expansion and stemming come from the en_search / ar_search analyzers
      // applied to the text fields automatically.
      must.push({
        bool: {
          should: [
            {
              multi_match: {
                query: q,
                type: 'phrase',
                fields: [
                  'nameEn^4',
                  'nameAr^4',
                  'descriptionEn',
                  'descriptionAr',
                ],
                boost: 3,
              },
            },
            {
              multi_match: {
                query: q,
                type: 'best_fields',
                fields: [
                  'nameEn^3',
                  'nameAr^3',
                  'descriptionEn',
                  'descriptionAr',
                ],
                fuzziness: 'AUTO',
                prefix_length: 1,
                operator: 'and',
              },
            },
            {
              multi_match: {
                query: q,
                type: 'bool_prefix',
                fields: [
                  'nameSuggest',
                  'nameSuggest._2gram',
                  'nameSuggest._3gram',
                ],
              },
            },
          ],
        },
      });
    }

    if (filters.categoryIds?.length) {
      filter.push({ terms: { categoryPath: filters.categoryIds } });
    }

    if (filters.countries?.length) {
      filter.push({ terms: { supplierCountry: filters.countries } });
    }

    if (filters.supplierTypes?.length) {
      filter.push({ terms: { supplierType: filters.supplierTypes } });
    }

    if (filters.verifiedOnly) {
      filter.push({ term: { supplierIsVerified: true } });
    }

    if (filters.priceMin !== undefined || filters.priceMax !== undefined) {
      const range: Record<string, number> = {};
      if (filters.priceMin !== undefined) range.gte = filters.priceMin;
      if (filters.priceMax !== undefined) range.lte = filters.priceMax;
      filter.push({ range: { costPrice: range } });
    }

    if (filters.moqMin !== undefined || filters.moqMax !== undefined) {
      const range: Record<string, number> = {};
      if (filters.moqMin !== undefined) range.gte = filters.moqMin;
      if (filters.moqMax !== undefined) range.lte = filters.moqMax;
      filter.push({ range: { moq: range } });
    }

    const sortOrder = this.buildSort(filters.sort);
    const from = ((filters.page ?? 1) - 1) * (filters.limit ?? 24);
    const size = filters.limit ?? 24;

    // Wrap the bool query in function_score only when a text query is present.
    // This boosts verified suppliers and popular products without affecting
    // pure-filter browses (where the default relevance score is meaningless).
    const boolClause = { bool: { must, filter } };
    const queryClause: object = filters.q?.trim()
      ? {
          function_score: {
            query: boolClause,
            functions: [
              {
                filter: { term: { supplierIsVerified: true } },
                weight: 1.3,
              },
              {
                field_value_factor: {
                  field: 'viewCount',
                  modifier: 'ln1p',
                  missing: 0,
                  // Cap popularity contribution so it acts as a tiebreaker
                  // rather than overriding BM25 relevance. Without this,
                  // ln1p(1000) ≈ 6.9 multiplied against the verified-supplier
                  // weight produces a combined factor > 8× the BM25 score.
                  max_boost: 2.0,
                },
              },
            ],
            score_mode: 'sum',
            boost_mode: 'multiply',
          },
        }
      : boolClause;

    return {
      index: INDEX_NAME,
      from,
      size,
      query: queryClause,
      sort: sortOrder,
      aggs:
        filters.facets !== false
          ? {
              countries: {
                terms: { field: 'supplierCountry', size: 50 },
              },
              supplierTypes: {
                terms: { field: 'supplierType', size: 10 },
              },
              verifiedCount: {
                filter: { term: { supplierIsVerified: true } },
              },
              categories: {
                terms: { field: 'categoryPath', size: 100 },
              },
              priceStats: {
                stats: { field: 'costPrice' },
              },
              moqStats: {
                stats: { field: 'moq' },
              },
            }
          : undefined,
    };
  }

  /**
   * Autocomplete suggestions using the search_as_you_type field.
   *
   * Uses a `bool_prefix` multi_match against `nameSuggest` and its ngram
   * sub-fields — the correct query type for `search_as_you_type` (the
   * completion suggester API only works with the `completion` field type).
   */
  async suggest(q: string): Promise<string[]> {
    try {
      const result = await this.client.search<SearchProductDocument>({
        index: INDEX_NAME,
        size: 8,
        query: {
          bool: {
            must: [
              {
                multi_match: {
                  query: q,
                  type: 'bool_prefix',
                  fields: [
                    'nameSuggest',
                    'nameSuggest._2gram',
                    'nameSuggest._3gram',
                  ],
                },
              },
            ],
            filter: [{ term: { status: 'active' } }],
          },
        },
        _source: ['nameEn', 'nameAr'],
      });

      // Prefer the English name; fall back to Arabic so Arabic-only products
      // are never dropped from autocomplete results.
      const seen = new Set<string>();
      const suggestions: string[] = [];
      for (const hit of result.hits.hits) {
        const name = hit._source?.nameEn || hit._source?.nameAr;
        if (name && !seen.has(name)) {
          seen.add(name);
          suggestions.push(name);
        }
      }
      return suggestions;
    } catch (err) {
      this.logger.warn(`Suggest failed: ${(err as Error).message}`);
      return [];
    }
  }

  private buildSort(sort?: string): string[] {
    switch (sort) {
      case 'price_asc':
        return ['costPrice:asc'];
      case 'price_desc':
        return ['costPrice:desc'];
      case 'moq_asc':
        return ['moq:asc'];
      case 'moq_desc':
        return ['moq:desc'];
      case 'newest':
        return ['createdAt:desc'];
      default:
        // relevance: ES _score is the primary sort; createdAt breaks ties.
        return ['_score:desc', 'createdAt:desc'];
    }
  }

  private extractFacets(
    aggs: Record<string, unknown> | undefined,
  ): Record<string, unknown> {
    if (!aggs) return {};

    const countries =
      (
        aggs.countries as { buckets?: { key: string; doc_count: number }[] }
      )?.buckets?.map((b) => ({ value: b.key, count: b.doc_count })) ?? [];

    const supplierTypes =
      (
        aggs.supplierTypes as { buckets?: { key: string; doc_count: number }[] }
      )?.buckets?.map((b) => ({ value: b.key, count: b.doc_count })) ?? [];

    const categories =
      (
        aggs.categories as { buckets?: { key: string; doc_count: number }[] }
      )?.buckets?.map((b) => ({ value: b.key, count: b.doc_count })) ?? [];

    const priceStats = aggs.priceStats as
      | {
          min?: number;
          max?: number;
        }
      | undefined;

    const moqStats = aggs.moqStats as
      | {
          min?: number;
          max?: number;
        }
      | undefined;

    const verifiedCount =
      (aggs.verifiedCount as { doc_count?: number })?.doc_count ?? 0;

    return {
      countries,
      supplierTypes,
      categories,
      verifiedCount,
      priceRange: priceStats
        ? { min: priceStats.min ?? 0, max: priceStats.max ?? 0 }
        : null,
      moqRange: moqStats
        ? { min: moqStats.min ?? 0, max: moqStats.max ?? 0 }
        : null,
    };
  }
}
