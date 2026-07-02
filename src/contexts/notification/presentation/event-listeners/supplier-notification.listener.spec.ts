import { Test, type TestingModule } from '@nestjs/testing';
import { CommandBus } from '@nestjs/cqrs';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SupplierNotificationsListener } from './supplier-notification.listener';
import { SupplierApprovedEvent } from '../../../supplier/identity/domain/events/supplier-approved.event';
import { SupplierRejectedEvent } from '../../../supplier/identity/domain/events/supplier-rejected.event';
import { NotificationType } from '../../domain/notification.types';
import { CreateNotificationCommand } from '../../application/commands/create-notification.command';
import { EmailService } from '../../../../shared/infrastructure/services/email.service';
import { UserOrmEntity } from '../../../auth/infrastructure/persistence/user.orm-entity';

function makeUser(overrides: Partial<UserOrmEntity> = {}): UserOrmEntity {
  return Object.assign(new UserOrmEntity(), {
    id: 99,
    email: 'supplier@example.com',
    name: 'Test Supplier',
    ...overrides,
  });
}

describe('SupplierNotificationsListener', () => {
  let listener: SupplierNotificationsListener;

  const commandBus = { execute: jest.fn().mockResolvedValue(undefined) };
  const emailService = {
    sendApprovalDecisionEmail: jest.fn().mockResolvedValue(undefined),
  };
  const configService = {
    get: jest.fn().mockReturnValue('https://app.asasgate.net'),
  };
  const userRepo = { findOne: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupplierNotificationsListener,
        { provide: CommandBus, useValue: commandBus },
        { provide: EmailService, useValue: emailService },
        { provide: ConfigService, useValue: configService },
        {
          provide: getRepositoryToken(UserOrmEntity, 'write'),
          useValue: userRepo,
        },
      ],
    }).compile();

    listener = module.get(SupplierNotificationsListener);
  });

  describe('SupplierApprovedEvent', () => {
    it('loads the user, creates an in-app notification, and sends an approval email', async () => {
      const user = makeUser();
      userRepo.findOne.mockResolvedValue(user);

      const event = SupplierApprovedEvent.create('sup-uuid-1', 99, 'Acme Corp');
      await listener.handle(event);

      expect(userRepo.findOne).toHaveBeenCalledWith({ where: { id: 99 } });

      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.any(CreateNotificationCommand),
      );
      const notifCall = commandBus.execute.mock
        .calls[0][0] as CreateNotificationCommand;
      expect(notifCall.userId).toBe(99);
      expect(notifCall.type).toBe(NotificationType.SUPPLIER_APPROVED);
      expect(notifCall.payload).toMatchObject({
        supplierId: 'sup-uuid-1',
        companyName: 'Acme Corp',
      });

      expect(emailService.sendApprovalDecisionEmail).toHaveBeenCalledWith(
        'supplier@example.com',
        expect.objectContaining({
          subject: 'Your supplier account has been approved',
          recipientName: 'Test Supplier',
        }),
      );
    });

    it('falls back to "Supplier" when user has no name', async () => {
      userRepo.findOne.mockResolvedValue(makeUser({ name: null }));

      const event = SupplierApprovedEvent.create('sup-uuid-1', 99, 'Acme Corp');
      await listener.handle(event);

      expect(emailService.sendApprovalDecisionEmail).toHaveBeenCalledWith(
        'supplier@example.com',
        expect.objectContaining({ recipientName: 'Supplier' }),
      );
    });
  });

  describe('SupplierRejectedEvent', () => {
    it('loads the user, creates an in-app notification with reason, and sends a rejection email', async () => {
      const user = makeUser();
      userRepo.findOne.mockResolvedValue(user);

      const event = SupplierRejectedEvent.create(
        'sup-uuid-1',
        99,
        'Acme Corp',
        'Missing documents',
      );
      await listener.handle(event);

      expect(userRepo.findOne).toHaveBeenCalledWith({ where: { id: 99 } });

      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.any(CreateNotificationCommand),
      );
      const notifCall = commandBus.execute.mock
        .calls[0][0] as CreateNotificationCommand;
      expect(notifCall.userId).toBe(99);
      expect(notifCall.type).toBe(NotificationType.SUPPLIER_REJECTED);
      expect(notifCall.payload).toMatchObject({
        supplierId: 'sup-uuid-1',
        companyName: 'Acme Corp',
        reason: 'Missing documents',
      });

      expect(emailService.sendApprovalDecisionEmail).toHaveBeenCalledWith(
        'supplier@example.com',
        expect.objectContaining({
          subject: 'Your supplier account application was not approved',
          reason: 'Missing documents',
        }),
      );
    });

    it('handles rejection with null reason correctly', async () => {
      const user = makeUser();
      userRepo.findOne.mockResolvedValue(user);

      const event = SupplierRejectedEvent.create(
        'sup-uuid-1',
        99,
        'Acme Corp',
        null,
      );
      await listener.handle(event);

      const notifCall = commandBus.execute.mock
        .calls[0][0] as CreateNotificationCommand;
      expect(notifCall.payload).toMatchObject({
        supplierId: 'sup-uuid-1',
        reason: null,
      });

      expect(emailService.sendApprovalDecisionEmail).toHaveBeenCalledWith(
        'supplier@example.com',
        expect.objectContaining({
          subject: 'Your supplier account application was not approved',
          reason: null,
        }),
      );
    });
  });

  describe('error resilience', () => {
    it('does not throw when the in-app notification command fails', async () => {
      userRepo.findOne.mockResolvedValue(makeUser());
      commandBus.execute.mockRejectedValueOnce(new Error('DB error'));

      const event = SupplierApprovedEvent.create('sup-uuid-1', 99, 'Acme Corp');
      await expect(listener.handle(event)).resolves.toBeUndefined();
    });

    it('does not throw when the email send fails', async () => {
      userRepo.findOne.mockResolvedValue(makeUser());
      emailService.sendApprovalDecisionEmail.mockRejectedValueOnce(
        new Error('SMTP error'),
      );

      const event = SupplierApprovedEvent.create('sup-uuid-1', 99, 'Acme Corp');
      await expect(listener.handle(event)).resolves.toBeUndefined();
    });

    it('does not throw when user is not found (null)', async () => {
      userRepo.findOne.mockResolvedValue(null);

      const event = SupplierApprovedEvent.create('sup-uuid-1', 99, 'Acme Corp');
      await expect(listener.handle(event)).resolves.toBeUndefined();
    });
  });
});
