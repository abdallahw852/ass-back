export interface CreditTermsData {
  creditLimitSar: number;
  paymentTerms: string;
}

export class CreditTermsVo {
  // TODO(phase-2): replace placeholder with supplier-managed client_profiles row.
  // This requires a new client_profiles table (supplier_id, buyer_id, credit_limit_sar,
  // payment_terms), write commands SetClientCreditTermsCommand, and controller routes.
  static defaultTerms(): CreditTermsData {
    return {
      creditLimitSar: 100_000,
      paymentTerms: 'NET_30',
    };
  }
}
