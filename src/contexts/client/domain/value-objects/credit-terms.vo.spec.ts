import { CreditTermsVo } from './credit-terms.vo';

describe('CreditTermsVo.defaultTerms', () => {
  it('returns 100,000 SAR credit limit with NET_30 payment terms', () => {
    const terms = CreditTermsVo.defaultTerms();
    expect(terms.creditLimitSar).toBe(100_000);
    expect(terms.paymentTerms).toBe('NET_30');
  });
});
