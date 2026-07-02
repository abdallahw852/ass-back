export class GetSupplierHomeStatsQuery {
  constructor(
    public readonly userId: number,
    public readonly period: 'week' | 'month' | 'year' = 'month',
  ) {}
}
