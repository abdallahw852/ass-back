import type { AnalyticsEventOrmEntity } from '../infrastructure/persistence/analytics-event.orm-entity';

export const ANALYTICS_EVENT_REPOSITORY = Symbol('ANALYTICS_EVENT_REPOSITORY');

export interface IAnalyticsEventRepository {
  save(
    entity: Partial<AnalyticsEventOrmEntity>,
  ): Promise<AnalyticsEventOrmEntity>;
}
