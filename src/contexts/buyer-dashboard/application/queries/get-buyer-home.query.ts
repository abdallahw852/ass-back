export class GetBuyerHomeQuery {
  constructor(
    public readonly userId: number,
    public readonly period: 'week' | 'month' | 'year' = 'month',
  ) {}
}
