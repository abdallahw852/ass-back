export enum RfqType {
  PRODUCT_DIRECTED = 'product_directed',
  GENERAL_CUSTOM = 'general_custom',
}

export enum RfqStatus {
  OPEN = 'open',
  AWARDED = 'awarded',
  CLOSED = 'closed',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

export enum QuotationStatus {
  SUBMITTED = 'submitted',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

export type CustomFieldInput = {
  name: string;
  value: string;
};
