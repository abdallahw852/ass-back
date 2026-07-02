export const FEATURE_CATALOG = {
  max_products: { type: 'quota' as const, default: 5 },
  max_rfq_responses: { type: 'quota' as const, default: 10 },
  commission_rate: { type: 'number' as const, default: 5 },
} as const;

export type FeatureKey = keyof typeof FEATURE_CATALOG;
