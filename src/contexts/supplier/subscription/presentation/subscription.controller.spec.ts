import { RequestMethod } from '@nestjs/common';
import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Test, type TestingModule } from '@nestjs/testing';
import { AdminGuard } from '../../../../shared/guards/admin.guard';
import { SessionAuthGuard } from '../../../../shared/infrastructure/guards/session-auth.guard';
import { CreatePlanCommand } from '../application/commands/create-plan.command';
import { SubscriptionController } from './subscription.controller';
import { CreatePlanDto } from './dto/create-plan.dto';

describe('SubscriptionController', () => {
  let controller: SubscriptionController;
  let createPlanMethod: SubscriptionController['createPlan'];

  const commandBus = {
    execute: jest.fn<Promise<unknown>, [CreatePlanCommand]>(),
  };

  const queryBus = {
    execute: jest.fn<Promise<unknown>, [unknown]>(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SubscriptionController],
      providers: [
        { provide: CommandBus, useValue: commandBus },
        { provide: QueryBus, useValue: queryBus },
      ],
    }).compile();

    controller = module.get(SubscriptionController);
    const descriptor = Object.getOwnPropertyDescriptor(
      SubscriptionController.prototype,
      'createPlan',
    ) as PropertyDescriptor & {
      value: SubscriptionController['createPlan'];
    };
    const method = descriptor.value as unknown;

    createPlanMethod = method as SubscriptionController['createPlan'];
  });

  it('registers POST /subscriptions/plans with session and admin guards', () => {
    expect(Reflect.getMetadata(PATH_METADATA, SubscriptionController)).toBe(
      'subscriptions',
    );
    expect(Reflect.getMetadata(PATH_METADATA, createPlanMethod)).toBe('plans');
    expect(Reflect.getMetadata(METHOD_METADATA, createPlanMethod)).toBe(
      RequestMethod.POST,
    );
    expect(Reflect.getMetadata(GUARDS_METADATA, createPlanMethod)).toEqual([
      SessionAuthGuard,
      AdminGuard,
    ]);
  });

  it('dispatches CreatePlanCommand and formats the response', async () => {
    const dto: CreatePlanDto = {
      name: 'gold',
      displayNameAr: 'ذهبي',
      displayNameEn: 'Gold',
      price: 199,
      commissionRate: 3,
      features: ['Feature A', 'Feature B'],
    };
    const createdPlan = {
      _id: 'plan_public_id',
      name: 'gold',
      displayNameAr: 'ذهبي',
      displayNameEn: 'Gold',
      price: '199',
      currency: 'SAR',
      billingCycle: 'monthly',
      commissionRate: '3',
      features: ['Feature A', 'Feature B'],
      isActive: true,
    };

    commandBus.execute.mockResolvedValue(createdPlan);

    await expect(controller.createPlan(dto)).resolves.toEqual({
      plan: {
        id: 'plan_public_id',
        name: 'gold',
        displayNameAr: 'ذهبي',
        displayNameEn: 'Gold',
        price: '199',
        currency: 'SAR',
        billingCycle: 'monthly',
        commissionRate: '3',
        features: ['Feature A', 'Feature B'],
        entitlements: {},
        isActive: true,
        isDefault: undefined,
        platformPlanId: null,
        createdAt: undefined,
        updatedAt: undefined,
      },
    });

    expect(commandBus.execute).toHaveBeenCalledTimes(1);
    expect(commandBus.execute).toHaveBeenCalledWith(
      expect.any(CreatePlanCommand),
    );

    const command = commandBus.execute.mock.calls[0]?.[0];

    expect(command).toBeInstanceOf(CreatePlanCommand);
    expect(command.name).toBe('gold');
    expect(command.displayNameAr).toBe('ذهبي');
    expect(command.displayNameEn).toBe('Gold');
    expect(command.price).toBe(199);
    expect(command.currency).toBe('SAR');
    expect(command.billingCycle).toBe('monthly');
    expect(command.commissionRate).toBe(3);
    expect(command.features).toEqual(['Feature A', 'Feature B']);
    expect(command.isActive).toBe(true);
  });
});
