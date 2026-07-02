import { Brackets, ObjectLiteral, SelectQueryBuilder } from 'typeorm';

export interface TrigramColumn {
  /**
   * SQL column reference for this field — MUST be a compile-time string
   * literal. This value is interpolated directly into raw SQL; NEVER pass
   * a dynamic or user-supplied value here. Accepted forms:
   *   'p.name'          — alias.column
   *   's."companyName"' — alias."quotedColumn"
   *   'sku'             — bare column (no alias)
   */
  expr: string;
  /**
   * Weight multiplier applied to this column's trigram similarity when
   * computing the overall relevance score. Higher = more influential in ranking.
   */
  weight: number;
}

export interface TrigramSearchOptions {
  /** Raw search term from the user. */
  term: string;
  /** Columns to search across, each with an optional weight. */
  columns: TrigramColumn[];
  /**
   * Minimum word_similarity threshold a column must reach to count as a match
   * via trigram (i.e. for typo/partial tolerance). ILIKE substring matching is
   * always tried regardless of this threshold. Default: 0.3.
   */
  threshold?: number;
}

/**
 * Applies trigram-aware search to a TypeORM SelectQueryBuilder.
 *
 * For every column in `columns` it adds an OR condition that matches when:
 *   - the column contains the term as a substring (ILIKE '%term%'), OR
 *   - word_similarity(term, column) >= threshold  (catches typos / partial tokens)
 *
 * The overall predicate is ANDed into the query so it combines cleanly with
 * existing filters.
 *
 * Returns a SQL expression that scores match quality for each row. Pass the
 * returned expression to `qb.orderBy(rel, 'DESC')` or `addOrderBy` to rank
 * the best matches first. The expression uses `GREATEST` across all weighted
 * column similarities, so the highest-quality column match wins.
 *
 * @example
 *   const rel = applyTrigramSearch(qb, {
 *     term: filters.search,
 *     columns: [
 *       { expr: 'p.name',        weight: 3 },
 *       { expr: 'p."mainTitle"', weight: 2 },
 *       { expr: 'p.description', weight: 1 },
 *     ],
 *   });
 *   qb.orderBy(rel, 'DESC');
 */

// Monotonically increasing counter so each call gets distinct param names,
// preventing collisions when two searches are applied to the same QB.
let _paramSeq = 0;

// Whitelist for col.expr: bare identifier, alias.column, or alias."quotedColumn".
// col.expr is interpolated raw into SQL so we reject anything outside this pattern
// before touching the query builder.
const SAFE_EXPR_RE = /^[A-Za-z_]\w*(?:\.(?:[A-Za-z_]\w*|"[A-Za-z_]\w*"))?$/;

/** Builds the per-column WHERE fragment used by applyTrigramSearch. */
export function buildTrigramClause(
  col: TrigramColumn,
  pLike: string,
  pTerm: string,
  pThreshold: string,
): string {
  return `(${col.expr} ILIKE :${pLike} OR word_similarity(:${pTerm}, ${col.expr}) >= :${pThreshold})`;
}

export function applyTrigramSearch<T extends ObjectLiteral>(
  qb: SelectQueryBuilder<T>,
  { term, columns, threshold = 0.3 }: TrigramSearchOptions,
): string {
  if (columns.length === 0) {
    throw new Error('applyTrigramSearch: columns must not be empty');
  }

  for (const col of columns) {
    if (!SAFE_EXPR_RE.test(col.expr)) {
      throw new Error(
        `applyTrigramSearch: unsafe column expression "${col.expr}" — ` +
          `col.expr must be a compile-time constant like 'p.name' or 'p."mainTitle"'`,
      );
    }
  }

  const n = ++_paramSeq;
  const pTerm = `trgmTerm_${n}`;
  const pLike = `trgmLike_${n}`;
  const pThreshold = `trgmThreshold_${n}`;

  const like = `%${term}%`;

  qb.setParameter(pTerm, term);
  qb.setParameter(pLike, like);
  qb.setParameter(pThreshold, threshold);

  // WHERE predicate: a row matches if ANY column satisfies either condition.
  qb.andWhere(
    new Brackets((inner) => {
      for (const col of columns) {
        inner.orWhere(buildTrigramClause(col, pLike, pTerm, pThreshold));
      }
    }),
  );

  // ORDER BY expression: GREATEST across weighted per-column similarities.
  // COALESCE handles nullable columns by treating null similarity as 0.
  const weightedSims = columns
    .map(
      (col) =>
        `${col.weight} * word_similarity(:${pTerm}, COALESCE(${col.expr}, ''))`,
    )
    .join(', ');

  return `GREATEST(${weightedSims})`;
}
