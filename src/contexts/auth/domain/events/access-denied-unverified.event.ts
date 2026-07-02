import { DomainEvent } from '../../../../shared/domain/domain-event';

export class AccessDeniedUnverifiedEvent extends DomainEvent {
  private constructor(
    aggregateId: string,
    version: number,
    public readonly userPublicId: string,
    public readonly route: string,
  ) {
    super(aggregateId, 'User', version);
  }

  static create(params: {
    aggregateId: string;
    version: number;
    userPublicId: string;
    route: string;
  }): AccessDeniedUnverifiedEvent {
    return new AccessDeniedUnverifiedEvent(
      params.aggregateId,
      params.version,
      params.userPublicId,
      params.route,
    );
  }

  toPayload(): Record<string, unknown> {
    return { userPublicId: this.userPublicId, route: this.route };
  }
}
