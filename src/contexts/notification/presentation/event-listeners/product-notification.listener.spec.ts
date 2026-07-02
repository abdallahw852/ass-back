import { Test, type TestingModule } from '@nestjs/testing';
import { CommandBus } from '@nestjs/cqrs';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ProductNotificationsListener } from './product-notification.listener';
import { ProductApprovedEvent } from '../../../product/domain/events/product-approved.event';
import { ProductRejectedEvent } from '../../../product/domain/events/product-rejected.event';
import { NotificationType } from '../../domain/notification.types';
import { CreateNotificationCommand } from '../../application/commands/create-notification.command';
import { EmailService } from '../../../../shared/infrastructure/services/email.service';
import { SupplierOrmEntity } from '../../../supplier/identity/infrastructure/persistence/supplier.orm-entity';
import { UserOrmEntity } from '../../../auth/infrastructure/persistence/user.orm-entity';

function makeSupplier(userId = 99): SupplierOrmEntity {
  return Object.assign(new SupplierOrmEntity(), { id: 1, userId });
}

function makeUser(overrides: Partial<UserOrmEntity> = {}): UserOrmEntity {
  return Object.assign(new UserOrmEntity(), {
    id: 99,
    email: 'supplier@example.com',
    name: 'Test Supplier',
    ...overrides,
  });
}

describe('ProductNotificationsListener', () => {
  let listener: ProductNotificationsListener;

  const commandBus = { execute: jest.fn().mockResolvedValue(undefined) };
  const emailService = {
    sendApprovalDecisionEmail: jest.fn().mockResolvedValue(undefined),
  };
  const configService = {
    get: jest.fn().mockReturnValue('https://app.asasgate.net'),
  };
  const supplierRepo = { findOne: jest.fn() };
  const userRepo = { findOne: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductNotificationsListener,
        { provide: CommandBus, useValue: commandBus },
        { provide: EmailService, useValue: emailService },
        { provide: ConfigService, useValue: configService },
        {
          provide: getRepositoryToken(SupplierOrmEntity, 'write'),
          useValue: supplierRepo,
        },
        {
          provide: getRepositoryToken(UserOrmEntity, 'write'),
          useValue: userRepo,
        },
      ],
    }).compile();

    listener = module.get(ProductNotificationsListener);
  });

  describe('ProductApprovedEvent', () => {
    it('loads supplier and user, creates in-app notification, sends approval email', async () => {
      supplierRepo.findOne.mockResolvedValue(makeSupplier());
      userRepo.findOne.mockResolvedValue(makeUser());

      const event = ProductApprovedEvent.create('prod-uuid-1', 1, 'Widget Pro');
      await listener.handle(event);

      expect(supplierRepo.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(userRepo.findOne).toHaveBeenCalledWith({ where: { id: 99 } });

      const notifCall = commandBus.execute.mock
        .calls[0][0] as CreateNotificationCommand;
      expect(notifCall.userId).toBe(99);
      expect(notifCall.type).toBe(NotificationType.PRODUCT_APPROVED);
      expect(notifCall.payload).toMatchObject({
        productId: 'prod-uuid-1',
        productName: 'Widget Pro',
      });

      expect(emailService.sendApprovalDecisionEmail).toHaveBeenCalledWith(
        'supplier@example.com',
        expect.objectContaining({
          subject: expect.stringContaining('approved'),
          recipientName: 'Test Supplier',
        }),
      );
    });

    it('uses "Supplier" fallback when user has no name', async () => {
      supplierRepo.findOne.mockResolvedValue(makeSupplier());
      userRepo.findOne.mockResolvedValue(makeUser({ name: null }));

      await listener.handle(
        ProductApprovedEvent.create('prod-uuid-1', 1, 'Widget Pro'),
      );

      expect(emailService.sendApprovalDecisionEmail).toHaveBeenCalledWith(
        'supplier@example.com',
        expect.objectContaining({ recipientName: 'Supplier' }),
      );
    });
  });

  describe('ProductRejectedEvent', () => {
    it('loads supplier and user, creates in-app notification with reason, sends rejection email', async () => {
      supplierRepo.findOne.mockResolvedValue(makeSupplier());
      userRepo.findOne.mockResolvedValue(makeUser());

      const event = ProductRejectedEvent.create(
        'prod-uuid-1',
        1,
        'Widget Pro',
        'Missing safety certification',
      );
      await listener.handle(event);

      const notifCall = commandBus.execute.mock
        .calls[0][0] as CreateNotificationCommand;
      expect(notifCall.type).toBe(NotificationType.PRODUCT_REJECTED);
      expect(notifCall.payload).toMatchObject({
        reason: 'Missing safety certification',
      });

      expect(emailService.sendApprovalDecisionEmail).toHaveBeenCalledWith(
        'supplier@example.com',
        expect.objectContaining({
          subject: expect.stringContaining('not approved'),
          reason: 'Missing safety certification',
        }),
      );
    });
  });

  describe('error resilience', () => {
    it('does not throw when supplier is not found', async () => {
      supplierRepo.findOne.mockResolvedValue(null);

      await expect(
        listener.handle(
          ProductApprovedEvent.create('prod-uuid-1', 1, 'Widget Pro'),
        ),
      ).resolves.toBeUndefined();

      expect(commandBus.execute).not.toHaveBeenCalled();
    });

    it('does not throw when in-app notification fails', async () => {
      supplierRepo.findOne.mockResolvedValue(makeSupplier());
      userRepo.findOne.mockResolvedValue(makeUser());
      commandBus.execute.mockRejectedValueOnce(new Error('DB error'));

      await expect(
        listener.handle(
          ProductApprovedEvent.create('prod-uuid-1', 1, 'Widget Pro'),
        ),
      ).resolves.toBeUndefined();
    });

    it('does not throw when email send fails', async () => {
      supplierRepo.findOne.mockResolvedValue(makeSupplier());
      userRepo.findOne.mockResolvedValue(makeUser());
      emailService.sendApprovalDecisionEmail.mockRejectedValueOnce(
        new Error('SMTP error'),
      );

      await expect(
        listener.handle(
          ProductApprovedEvent.create('prod-uuid-1', 1, 'Widget Pro'),
        ),
      ).resolves.toBeUndefined();
    });
  });
});
