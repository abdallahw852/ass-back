import { GetCurrentUserHandler } from './get-current-user.handler';
import { GetCurrentUserQuery } from '../get-current-user.query';
import { UserRole } from '../../../domain/enums/user-role.enum';
import type { IUserRepository } from '../../../domain/repositories/user.repository.interface';
import type { UserOrmEntity } from '../../../infrastructure/persistence/user.orm-entity';

type SupplierStub = { id: number; _id: string } | null;

function makeHandler(opts: {
  user: Partial<UserOrmEntity> & { supplier?: SupplierStub };
  hasActiveSubscription?: boolean;
}): GetCurrentUserHandler {
  const userRepo = {
    findByPublicId: jest.fn().mockResolvedValue(opts.user),
  } as unknown as IUserRepository;

  const memberRepo = {
    findOne: jest.fn().mockResolvedValue(null),
  };

  const subscriptionRepo = {
    findOne: jest
      .fn()
      .mockResolvedValue(opts.hasActiveSubscription ? { id: 1 } : null),
  };

  return new GetCurrentUserHandler(
    userRepo,
    memberRepo as never,
    subscriptionRepo as never,
  );
}

async function step(handler: GetCurrentUserHandler): Promise<string> {
  const result = (await handler.execute(
    new GetCurrentUserQuery('public-id'),
  )) as { onboardingStep: string };
  return result.onboardingStep;
}

describe('GetCurrentUserHandler onboardingStep', () => {
  it('returns "complete" for a buyer', async () => {
    const handler = makeHandler({
      user: { role: UserRole.BUYER, onboardingCompletedAt: null },
    });
    expect(await step(handler)).toBe('complete');
  });

  it('returns "complete" for a supplier with onboardingCompletedAt set', async () => {
    const handler = makeHandler({
      user: {
        role: UserRole.SUPPLIER,
        onboardingCompletedAt: new Date(),
        supplier: { id: 5, _id: 's-uuid' },
      },
      hasActiveSubscription: true,
    });
    expect(await step(handler)).toBe('complete');
  });

  it('returns "account_details" for a supplier with no supplier record', async () => {
    const handler = makeHandler({
      user: {
        role: UserRole.SUPPLIER,
        onboardingCompletedAt: null,
        supplier: null,
      },
    });
    expect(await step(handler)).toBe('account_details');
  });

  it('returns "plan" for a supplier with a record but no active subscription', async () => {
    const handler = makeHandler({
      user: {
        role: UserRole.SUPPLIER,
        onboardingCompletedAt: null,
        supplier: { id: 5, _id: 's-uuid' },
      },
      hasActiveSubscription: false,
    });
    expect(await step(handler)).toBe('plan');
  });

  it('returns "profile" for a supplier with a record and active subscription but not yet completed', async () => {
    const handler = makeHandler({
      user: {
        role: UserRole.SUPPLIER,
        onboardingCompletedAt: null,
        supplier: { id: 5, _id: 's-uuid' },
      },
      hasActiveSubscription: true,
    });
    expect(await step(handler)).toBe('profile');
  });
});
