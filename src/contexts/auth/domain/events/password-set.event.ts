import { DomainEvent } from '../../../../shared/domain/domain-event';

export type PasswordSetReason = 'register' | 'initial-setup' | 'change';

export class PasswordSetEvent extends DomainEvent {
  private constructor(
    aggregateId: string,
    version: number,
    public readonly email: string,
    public readonly reason: PasswordSetReason,
  ) {
    super(aggregateId, 'User', version);
  }

  static create(params: {
    aggregateId: string;
    version: number;
    email: string;
    reason: PasswordSetReason;
  }): PasswordSetEvent {
    return new PasswordSetEvent(
      params.aggregateId,
      params.version,
      params.email,
      params.reason,
    );
  }

  toPayload(): Record<string, unknown> {
    return { email: this.email, reason: this.reason };
  }
}
