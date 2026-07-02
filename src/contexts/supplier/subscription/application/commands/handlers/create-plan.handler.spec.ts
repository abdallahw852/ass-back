import { ConflictException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { PAYMENT_GATEWAY_PORT } from '../../ports/payment-gateway.port';
import { PLAN_REPOSITORY } from '../../../domain/plan.repository.interface';
import { CreatePlanCommand } from '../create-plan.command';
import { CreatePlanHandler } from './create-plan.handler';

describe('CreatePlanHandler', () => {
  let handler: CreatePlanHandler;

  const planRepository = {
    findByName: jest.fn(),
    findDefault: jest.fn(),
    save: jest.fn(),
  };

  const paymentGateway = {
    createSubscriptionPlan: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreatePlanHandler,
        { provide: PLAN_REPOSITORY, useValue: planRepository },
        { provide: PAYMENT_GATEWAY_PORT, useValue: paymentGateway },
      ],
    }).compile();

    handler = module.get(CreatePlanHandler);
  });

  it('creates a Paymob subscription plan for paid recurring plans', async () => {
    const command = new CreatePlanCommand(
      'gold',
      'ذهبي',
      'Gold',
      199,
      'SAR',
      'monthly',
      3,
      ['Feature A'],
      true,
    );

    const savedPlan = {
      _id: 'plan_public_id',
      name: 'gold',
      platformPlanId: '321',
    };

    planRepository.findByName.mockResolvedValue(null);
    paymentGateway.createSubscriptionPlan.mockResolvedValue({ planId: '321' });
    planRepository.save.mockResolvedValue(savedPlan);

    await expect(handler.execute(command)).resolves.toBe(savedPlan);

    expect(paymentGateway.createSubscriptionPlan).toHaveBeenCalledWith({
      amountCents: 19900,
      billingCycle: 'monthly',
      currency: 'SAR',
      fee: '',
      isActive: true,
      name: 'gold',
    });
    expect(planRepository.save).toHaveBeenCalledWith({
      name: 'gold',
      displayNameAr: 'ذهبي',
      displayNameEn: 'Gold',
      price: '199',
      currency: 'SAR',
      billingCycle: 'monthly',
      platformPlanId: '321',
      commissionRate: '3',
      features: ['Feature A'],
      isActive: true,
      isDefault: false,
    });
  });

  it('skips Paymob subscription plan creation for free plans', async () => {
    const command = new CreatePlanCommand(
      'starter',
      'مبتدئ',
      'Starter',
      0,
      'SAR',
      'free',
      0,
      ['Feature A'],
      true,
    );

    const savedPlan = {
      _id: 'starter_plan_public_id',
      name: 'starter',
      platformPlanId: null,
    };

    planRepository.findByName.mockResolvedValue(null);
    planRepository.save.mockResolvedValue(savedPlan);

    await expect(handler.execute(command)).resolves.toBe(savedPlan);

    expect(paymentGateway.createSubscriptionPlan).not.toHaveBeenCalled();
    expect(planRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'starter',
        platformPlanId: null,
      }),
    );
  });

  it('rejects duplicate plan names', async () => {
    const command = new CreatePlanCommand(
      'gold',
      'ذهبي',
      'Gold',
      199,
      'SAR',
      'monthly',
      3,
      ['Feature A'],
      true,
    );

    planRepository.findByName.mockResolvedValue({ id: 1, name: 'gold' });

    await expect(handler.execute(command)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(paymentGateway.createSubscriptionPlan).not.toHaveBeenCalled();
    expect(planRepository.save).not.toHaveBeenCalled();
  });
});
