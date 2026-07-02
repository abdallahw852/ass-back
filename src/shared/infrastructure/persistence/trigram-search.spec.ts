import { Brackets, ObjectLiteral, SelectQueryBuilder } from 'typeorm';
import {
  applyTrigramSearch,
  buildTrigramClause,
  TrigramColumn,
} from './trigram-search';

// ---------------------------------------------------------------------------
// Minimal fake that satisfies the SelectQueryBuilder surface we actually call
// ---------------------------------------------------------------------------
type FakeSelectQb = {
  params: Record<string, unknown>;
  andWhereCalls: Array<string | Brackets>;
  setParameter(k: string, v: unknown): FakeSelectQb;
  andWhere(cond: string | Brackets): FakeSelectQb;
};

function makeFakeQb(): FakeSelectQb {
  const params: Record<string, unknown> = {};
  const andWhereCalls: Array<string | Brackets> = [];
  const fakeQb: FakeSelectQb = {
    params,
    andWhereCalls,
    setParameter(k, v) {
      params[k] = v;
      return fakeQb;
    },
    andWhere(cond) {
      andWhereCalls.push(cond);
      return fakeQb;
    },
  };
  return fakeQb;
}

// ---------------------------------------------------------------------------

const columns: TrigramColumn[] = [
  { expr: 'p.name', weight: 3 },
  { expr: 'p."mainTitle"', weight: 2 },
  { expr: 'p.description', weight: 1 },
];

// ---------------------------------------------------------------------------
// buildTrigramClause — pure helper, no TypeORM dependency
// ---------------------------------------------------------------------------

describe('buildTrigramClause', () => {
  it('builds an ILIKE + word_similarity OR clause', () => {
    const clause = buildTrigramClause(
      { expr: 'p.name', weight: 3 },
      'trgmLike_1',
      'trgmTerm_1',
      'trgmThreshold_1',
    );
    expect(clause).toBe(
      '(p.name ILIKE :trgmLike_1 OR word_similarity(:trgmTerm_1, p.name) >= :trgmThreshold_1)',
    );
  });

  it('works with a quoted column expression', () => {
    const clause = buildTrigramClause(
      { expr: 'p."mainTitle"', weight: 2 },
      'trgmLike_2',
      'trgmTerm_2',
      'trgmThreshold_2',
    );
    expect(clause).toContain('p."mainTitle" ILIKE :trgmLike_2');
    expect(clause).toContain('word_similarity(:trgmTerm_2, p."mainTitle")');
  });
});

// ---------------------------------------------------------------------------
// applyTrigramSearch — integration with the QB
// ---------------------------------------------------------------------------

describe('applyTrigramSearch', () => {
  it('binds trgmTerm, trgmLike, and trgmThreshold parameters', () => {
    const qb = makeFakeQb();
    applyTrigramSearch(qb as unknown as SelectQueryBuilder<ObjectLiteral>, {
      term: 'laptop',
      columns,
    });

    const values = Object.values(qb.params);
    expect(values).toContain('laptop');
    expect(values).toContain('%laptop%');
    expect(values).toContain(0.3);
  });

  it('uses the supplied threshold when provided', () => {
    const qb = makeFakeQb();
    applyTrigramSearch(qb as unknown as SelectQueryBuilder<ObjectLiteral>, {
      term: 'phone',
      columns,
      threshold: 0.5,
    });

    expect(Object.values(qb.params)).toContain(0.5);
  });

  it('uses distinct parameter names on repeated calls to the same QB', () => {
    const qb = makeFakeQb();
    applyTrigramSearch(qb as unknown as SelectQueryBuilder<ObjectLiteral>, {
      term: 'first',
      columns: [{ expr: 'p.name', weight: 1 }],
    });
    applyTrigramSearch(qb as unknown as SelectQueryBuilder<ObjectLiteral>, {
      term: 'second',
      columns: [{ expr: 'p.name', weight: 1 }],
    });

    // Both terms must survive — the second call must not overwrite the first.
    const values = Object.values(qb.params);
    expect(values).toContain('first');
    expect(values).toContain('second');
    // Two independent Brackets blocks, one per call.
    expect(qb.andWhereCalls).toHaveLength(2);
  });

  it('adds exactly one Brackets andWhere call', () => {
    const qb = makeFakeQb();
    applyTrigramSearch(qb as unknown as SelectQueryBuilder<ObjectLiteral>, {
      term: 'laptop',
      columns,
    });

    expect(qb.andWhereCalls).toHaveLength(1);
    expect(qb.andWhereCalls[0]).toBeInstanceOf(Brackets);
  });

  it('returns a GREATEST() relevance SQL expression with all columns', () => {
    const qb = makeFakeQb();
    const rel = applyTrigramSearch(
      qb as unknown as SelectQueryBuilder<ObjectLiteral>,
      { term: 'cable', columns },
    );

    expect(rel).toMatch(/^GREATEST\(/);
    expect(rel).toContain('word_similarity(:trgmTerm');
    expect(rel).toContain("COALESCE(p.name, '')");
    expect(rel).toContain('COALESCE(p."mainTitle", \'\')');
    expect(rel).toContain("COALESCE(p.description, '')");
  });

  it('applies column weights in the relevance expression', () => {
    const qb = makeFakeQb();
    const rel = applyTrigramSearch(
      qb as unknown as SelectQueryBuilder<ObjectLiteral>,
      { term: 'phone', columns },
    );

    expect(rel).toContain('3 * word_similarity');
    expect(rel).toContain('2 * word_similarity');
    expect(rel).toContain('1 * word_similarity');
  });

  it('throws when a column expr fails the safe-identifier whitelist', () => {
    const unsafe = [
      "'; DROP TABLE products; --",
      'p.name OR 1=1',
      'req.query.field',
      '(subquery)',
      'p. name',
    ];
    for (const expr of unsafe) {
      const qb = makeFakeQb();
      expect(() =>
        applyTrigramSearch(qb as unknown as SelectQueryBuilder<ObjectLiteral>, {
          term: 'foo',
          columns: [{ expr, weight: 1 }],
        }),
      ).toThrow('unsafe column expression');
    }
  });

  it('accepts all valid compile-time column reference forms', () => {
    const safe = [
      'name',
      'p.name',
      'p."mainTitle"',
      's."companyName"',
      'i.sku',
    ];
    for (const expr of safe) {
      const qb = makeFakeQb();
      expect(() =>
        applyTrigramSearch(qb as unknown as SelectQueryBuilder<ObjectLiteral>, {
          term: 'foo',
          columns: [{ expr, weight: 1 }],
        }),
      ).not.toThrow();
    }
  });

  it('throws when columns array is empty', () => {
    const qb = makeFakeQb();
    expect(() =>
      applyTrigramSearch(qb as unknown as SelectQueryBuilder<ObjectLiteral>, {
        term: 'foo',
        columns: [],
      }),
    ).toThrow('applyTrigramSearch: columns must not be empty');
  });

  it('works with a single column', () => {
    const singleCol: TrigramColumn[] = [{ expr: 'u.name', weight: 1 }];
    const qb = makeFakeQb();
    const rel = applyTrigramSearch(
      qb as unknown as SelectQueryBuilder<ObjectLiteral>,
      { term: 'alice', columns: singleCol },
    );

    expect(qb.andWhereCalls).toHaveLength(1);
    expect(rel).toContain('GREATEST(');
    expect(rel).toContain("COALESCE(u.name, '')");
    // Single column → exactly one word_similarity call in the expression.
    expect((rel.match(/word_similarity/g) ?? []).length).toBe(1);
  });
});
