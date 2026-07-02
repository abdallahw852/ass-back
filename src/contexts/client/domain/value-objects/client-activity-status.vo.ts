export enum ClientActivityStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

const ACTIVE_WINDOW_DAYS = 60;

export interface ActivityInput {
  lastPaidOrderAt: Date | null;
  now: Date;
}

export class ClientActivityStatusVo {
  static derive(input: ActivityInput): ClientActivityStatus {
    if (!input.lastPaidOrderAt) return ClientActivityStatus.INACTIVE;
    const diffMs = input.now.getTime() - input.lastPaidOrderAt.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    return diffDays <= ACTIVE_WINDOW_DAYS
      ? ClientActivityStatus.ACTIVE
      : ClientActivityStatus.INACTIVE;
  }
}
