import {
  ClientClassification,
  ClientClassificationVo,
} from './client-classification.vo';

describe('ClientClassificationVo.derive', () => {
  it('returns AUTHORIZED_AGENT when role is agent (regardless of spend/orders)', () => {
    expect(
      ClientClassificationVo.derive({
        role: 'agent',
        lifetimeValueSar: 500_000,
        paidOrdersCount: 100,
      }),
    ).toBe(ClientClassification.AUTHORIZED_AGENT);
  });

  it('returns VIP when lifetime value >= 250,000', () => {
    expect(
      ClientClassificationVo.derive({
        role: 'buyer',
        lifetimeValueSar: 250_000,
        paidOrdersCount: 1,
      }),
    ).toBe(ClientClassification.VIP);
  });

  it('returns NEW when lifetime value is 1 below VIP threshold (249,999)', () => {
    expect(
      ClientClassificationVo.derive({
        role: 'buyer',
        lifetimeValueSar: 249_999,
        paidOrdersCount: 1,
      }),
    ).toBe(ClientClassification.NEW);
  });

  it('returns VIP over PERMANENT when both thresholds are met', () => {
    expect(
      ClientClassificationVo.derive({
        role: 'buyer',
        lifetimeValueSar: 300_000,
        paidOrdersCount: 10,
      }),
    ).toBe(ClientClassification.VIP);
  });

  it('returns PERMANENT when paidOrdersCount >= 5 and value < 250,000', () => {
    expect(
      ClientClassificationVo.derive({
        role: 'buyer',
        lifetimeValueSar: 1_000,
        paidOrdersCount: 5,
      }),
    ).toBe(ClientClassification.PERMANENT);
  });

  it('returns NEW when paidOrdersCount is 4 (below threshold)', () => {
    expect(
      ClientClassificationVo.derive({
        role: 'buyer',
        lifetimeValueSar: 0,
        paidOrdersCount: 4,
      }),
    ).toBe(ClientClassification.NEW);
  });

  it('returns NEW for a brand-new buyer with a single small order', () => {
    expect(
      ClientClassificationVo.derive({
        role: 'buyer',
        lifetimeValueSar: 500,
        paidOrdersCount: 1,
      }),
    ).toBe(ClientClassification.NEW);
  });
});
