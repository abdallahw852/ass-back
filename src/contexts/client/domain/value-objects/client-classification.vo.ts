export enum ClientClassification {
  AUTHORIZED_AGENT = 'AUTHORIZED_AGENT',
  VIP = 'VIP',
  PERMANENT = 'PERMANENT',
  NEW = 'NEW',
}

export const ClientClassificationLabel: Record<ClientClassification, string> = {
  [ClientClassification.AUTHORIZED_AGENT]: 'وكيل معتمد',
  [ClientClassification.VIP]: 'VIP',
  [ClientClassification.PERMANENT]: 'دائم',
  [ClientClassification.NEW]: 'جديد',
};

const VIP_LIFETIME_VALUE_SAR = 250_000;
const PERMANENT_PAID_ORDERS_THRESHOLD = 5;

export interface ClassificationInput {
  role: string;
  lifetimeValueSar: number;
  paidOrdersCount: number;
}

export class ClientClassificationVo {
  // TODO(phase-2): add 'agent' to UserRole enum + admin-managed role assignment;
  // until then, AUTHORIZED_AGENT is never resolved.
  static derive(input: ClassificationInput): ClientClassification {
    if (input.role === 'agent') {
      return ClientClassification.AUTHORIZED_AGENT;
    }
    if (input.lifetimeValueSar >= VIP_LIFETIME_VALUE_SAR) {
      return ClientClassification.VIP;
    }
    if (input.paidOrdersCount >= PERMANENT_PAID_ORDERS_THRESHOLD) {
      return ClientClassification.PERMANENT;
    }
    return ClientClassification.NEW;
  }
}
