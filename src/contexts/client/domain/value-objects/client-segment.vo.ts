import { ClientClassification } from './client-classification.vo';

/**
 * Segment chosen by the supplier when manually adding a client.
 * Unlike order-derived clients, this is stored, not derived.
 */
export type ClientSegment = 'vip' | 'regular' | 'new';

export class ClientSegmentVo {
  static toClassification(segment: ClientSegment): ClientClassification {
    switch (segment) {
      case 'vip':
        return ClientClassification.VIP;
      case 'new':
        return ClientClassification.NEW;
      case 'regular':
      default:
        return ClientClassification.PERMANENT;
    }
  }
}
