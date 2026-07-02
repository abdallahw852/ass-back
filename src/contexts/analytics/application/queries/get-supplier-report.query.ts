export class GetPlatformOverviewQuery {
  constructor(public readonly period: 'week' | 'month' | 'year' = 'month') {}
}
