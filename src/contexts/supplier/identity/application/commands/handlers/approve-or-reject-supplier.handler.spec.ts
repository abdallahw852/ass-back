import { Test, type TestingModule } from '@nestjs/testing';
import { CommandBus, EventBus } from '@nestjs/cqrs';
import { SUPPLIER_REPOSITORY } from '../../../domain/repositories/supplier.repository.interface';
import { ApproveOrRejectSupplierCommand } from '../approve-or-reject-supplier.command';
import { ApproveOrRejectSupplierHandler } from './approve-or-reject-supplier.handler';
import { SupplierVerificationStatus } from '../../../domain/enums/supplier-verification-status.enum';
import {
  InvalidSupplierStatusTransitionException,
  SupplierNotFoundException,
} from '../../../domain/supplier-identity.exceptions';
import { SupplierOrmEntity } from '../../../infrastructure/persistence/supplier.orm-entity';
import { SupplierApprovedEvent } from '../../../domain/events/supplier-approved.event';
import { SupplierRejectedEvent } from '../../../domain/events/supplier-rejected.event';

function makeSupplier(
  overrides: Partial<SupplierOrmEntity> = {},
): SupplierOrmEntity {
  return Object.assign(new SupplierOrmEntity(), {
    id: 1,
    _id: 'sup-uuid-1',
    userId: 99,
    companyName: 'Acme Corp',
    verificationStatus: SupplierVerificationStatus.PENDING,
    isVerified: false,
    rejectionReason: null,
    ...overrides,
  });
}

describe('ApproveOrRejectSupplierHandler', () => {
  let handler: ApproveOrRejectSupplierHandler;

  const supplierRepository = {
    findByPublicId: jest.fn(),
    save: jest.fn(),
    findByUserId: jest.fn(),
    findByRegistrationNumber: jest.fn(),
    findManyForListing: jest.fn(),
  };

  const commandBus = {
    execute: jest.fn().mockResolvedValue(undefined),
  };

  const eventBus = { publish: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApproveOrRejectSupplierHandler,
        { provide: SUPPLIER_REPOSITORY, useValue: supplierRepository },
        { provide: CommandBus, useValue: commandBus },
        { provide: EventBus, useValue: eventBus },
      ],
    }).compile();

    handler = module.get(ApproveOrRejectSupplierHandler);
  });

  it('approves a PENDING supplier: saves APPROVED + isVerified=true + null rejectionReason + dispatches audit event + publishes SupplierApprovedEvent', async () => {
    const supplier = makeSupplier({
      verificationStatus: SupplierVerificationStatus.PENDING,
    });
    supplierRepository.findByPublicId.mockResolvedValue(supplier);
    supplierRepository.save.mockImplementation(
      (s: Partial<SupplierOrmEntity>) =>
        Promise.resolve(Object.assign(new SupplierOrmEntity(), supplier, s)),
    );

    const command = new ApproveOrRejectSupplierCommand(
      'sup-uuid-1',
      'approve',
      undefined,
      42,
      'admin',
    );
    const result = await handler.execute(command);

    expect(result.verificationStatus).toBe(SupplierVerificationStatus.APPROVED);
    expect(result.isVerified).toBe(true);
    expect(result.rejectionReason).toBeNull();
    expect(commandBus.execute).toHaveBeenCalledTimes(1);
    expect(commandBus.execute).toHaveBeenCalledWith(
      expect.objectContaining({ eventName: 'supplier.approved' }),
    );
    expect(eventBus.publish).toHaveBeenCalledWith(
      expect.any(SupplierApprovedEvent),
    );
  });

  it('rejects a PENDING supplier with a reason: saves REJECTED + isVerified=false + rejectionReason set + dispatches audit event + publishes SupplierRejectedEvent', async () => {
    const supplier = makeSupplier({
      verificationStatus: SupplierVerificationStatus.PENDING,
    });
    supplierRepository.findByPublicId.mockResolvedValue(supplier);
    supplierRepository.save.mockImplementation(
      (s: Partial<SupplierOrmEntity>) =>
        Promise.resolve(Object.assign(new SupplierOrmEntity(), supplier, s)),
    );

    const command = new ApproveOrRejectSupplierCommand(
      'sup-uuid-1',
      'reject',
      'Missing documents',
      42,
      'admin',
    );
    const result = await handler.execute(command);

    expect(result.verificationStatus).toBe(SupplierVerificationStatus.REJECTED);
    expect(result.isVerified).toBe(false);
    expect(result.rejectionReason).toBe('Missing documents');
    expect(commandBus.execute).toHaveBeenCalledTimes(1);
    expect(commandBus.execute).toHaveBeenCalledWith(
      expect.objectContaining({ eventName: 'supplier.rejected' }),
    );
    expect(eventBus.publish).toHaveBeenCalledWith(
      expect.any(SupplierRejectedEvent),
    );
  });

  it('throws InvalidSupplierStatusTransitionException when approving an already-APPROVED supplier', async () => {
    const supplier = makeSupplier({
      verificationStatus: SupplierVerificationStatus.APPROVED,
      isVerified: true,
    });
    supplierRepository.findByPublicId.mockResolvedValue(supplier);

    const command = new ApproveOrRejectSupplierCommand(
      'sup-uuid-1',
      'approve',
      undefined,
      42,
      'admin',
    );
    await expect(handler.execute(command)).rejects.toBeInstanceOf(
      InvalidSupplierStatusTransitionException,
    );
    expect(supplierRepository.save).not.toHaveBeenCalled();
    expect(eventBus.publish).not.toHaveBeenCalled();
  });

  it('throws InvalidSupplierStatusTransitionException when rejecting an already-REJECTED supplier', async () => {
    const supplier = makeSupplier({
      verificationStatus: SupplierVerificationStatus.REJECTED,
      isVerified: false,
    });
    supplierRepository.findByPublicId.mockResolvedValue(supplier);

    const command = new ApproveOrRejectSupplierCommand(
      'sup-uuid-1',
      'reject',
      'Some reason',
      42,
      'admin',
    );
    await expect(handler.execute(command)).rejects.toBeInstanceOf(
      InvalidSupplierStatusTransitionException,
    );
    expect(supplierRepository.save).not.toHaveBeenCalled();
    expect(eventBus.publish).not.toHaveBeenCalled();
  });

  it('throws InvalidSupplierStatusTransitionException when rejecting without a reason', async () => {
    const supplier = makeSupplier({
      verificationStatus: SupplierVerificationStatus.PENDING,
    });
    supplierRepository.findByPublicId.mockResolvedValue(supplier);

    const command = new ApproveOrRejectSupplierCommand(
      'sup-uuid-1',
      'reject',
      undefined,
      42,
      'admin',
    );
    await expect(handler.execute(command)).rejects.toBeInstanceOf(
      InvalidSupplierStatusTransitionException,
    );
    expect(supplierRepository.save).not.toHaveBeenCalled();
    expect(eventBus.publish).not.toHaveBeenCalled();
  });

  it('throws SupplierNotFoundException when supplier is not found', async () => {
    supplierRepository.findByPublicId.mockResolvedValue(null);

    const command = new ApproveOrRejectSupplierCommand(
      'nonexistent-id',
      'approve',
      undefined,
      42,
      'admin',
    );
    await expect(handler.execute(command)).rejects.toBeInstanceOf(
      SupplierNotFoundException,
    );
    expect(eventBus.publish).not.toHaveBeenCalled();
  });
});
