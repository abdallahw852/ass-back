import {
  ClientActivityStatus,
  ClientActivityStatusVo,
} from './client-activity-status.vo';

describe('ClientActivityStatusVo.derive', () => {
  const now = new Date('2025-01-01T00:00:00.000Z');

  const daysAgo = (days: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() - days);
    return d;
  };

  it('returns INACTIVE when lastPaidOrderAt is null', () => {
    expect(ClientActivityStatusVo.derive({ lastPaidOrderAt: null, now })).toBe(
      ClientActivityStatus.INACTIVE,
    );
  });

  it('returns ACTIVE when last order was 59 days ago', () => {
    expect(
      ClientActivityStatusVo.derive({ lastPaidOrderAt: daysAgo(59), now }),
    ).toBe(ClientActivityStatus.ACTIVE);
  });

  it('returns ACTIVE when last order was exactly 60 days ago (inclusive boundary)', () => {
    expect(
      ClientActivityStatusVo.derive({ lastPaidOrderAt: daysAgo(60), now }),
    ).toBe(ClientActivityStatus.ACTIVE);
  });

  it('returns INACTIVE when last order was 61 days ago', () => {
    expect(
      ClientActivityStatusVo.derive({ lastPaidOrderAt: daysAgo(61), now }),
    ).toBe(ClientActivityStatus.INACTIVE);
  });
});
