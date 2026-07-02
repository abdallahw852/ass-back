import type { ClientClassification } from './value-objects/client-classification.vo';

export interface ClientReadModel {
  buyerPublicId: string;
  buyerInternalId: number;
  name: string | null;
  email: string;
  // TODO(phase-2): add company once a buyer-profiles table exists
  company: null;
  avatar: string | null;
  country: string | null;
  role: string;
  joinedAt: Date;
  firstOrderAt: Date;
  lastOrderAt: Date;
  ordersCount: number;
  lifetimeValueSar: number;
}

export interface ClientStats {
  totalOrders: number;
  lifetimeValueSar: number;
}

export interface ClientSummary {
  totalClients: number;
  totalLifetimeValueSar: number;
  vipAndAgentCount: number;
  totalOrders: number;
}

/** A manually-added contact/lead, as projected for the clients list. */
export interface ManualClientReadModel {
  id: string;
  companyName: string;
  fullName: string;
  email: string;
  phone: string;
  country: string;
  classification: ClientClassification;
  creditLimitSar: number | null;
  paymentTerms: string | null;
  notes: string | null;
  createdAt: Date;
}
