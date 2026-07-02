import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { SUPPLIER_REPOSITORY } from '../../../domain/repositories/supplier.repository.interface';
import { USER_REPOSITORY } from '../../../../../auth/domain/repositories/user.repository.interface';
import { RegisterSupplierCommand } from '../register-supplier.command';
import { RegisterSupplierHandler } from './register-supplier.handler';
import { SupplierVerificationStatus } from '../../../domain/enums/supplier-verification-status.enum';
import { UserRole } from '../../../../../auth/domain/enums/user-role.enum';

describe('RegisterSupplierHandler', () => {
  let handler: RegisterSupplierHandler;

  const supplierRepository = {
    findByUserId: jest.fn(),
    findByRegistrationNumber: jest.fn(),
    findByPublicId: jest.fn(),
    save: jest.fn(),
    findManyForListing: jest.fn(),
  };

  const userRepository = {
    findById: jest.fn(),
    save: jest.fn(),
    markOnboardingCompleted: jest.fn(),
  };

  const validInput = {
    companyName: 'Acme Corp',
    phoneNumber: '+966501234567',
    country: 'SA',
    activityType: 'Trading',
    businessSize: 'medium',
    registrationNumber: 'SA-12345678',
    registrationFileUrl: '/uploads/docs/reg.pdf',
    notes: null,
  };

  const mockUser = {
    id: 1,
    _id: 'user-uuid-1',
    email: 'supplier@example.com',
    role: UserRole.SUPPLIER,
    supplierId: null,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegisterSupplierHandler,
        { provide: SUPPLIER_REPOSITORY, useValue: supplierRepository },
        { provide: USER_REPOSITORY, useValue: userRepository },
      ],
    }).compile();

    handler = module.get(RegisterSupplierHandler);
  });

  it('saves the supplier with isVerified=false and verificationStatus=PENDING', async () => {
    supplierRepository.findByUserId.mockResolvedValue(null);
    supplierRepository.findByRegistrationNumber.mockResolvedValue(null);
    userRepository.findById.mockResolvedValue(mockUser);

    const savedSupplier = {
      id: 1,
      _id: 'sup-uuid-1',
      userId: 1,
      companyName: 'Acme Corp',
      isVerified: false,
      verificationStatus: SupplierVerificationStatus.PENDING,
      supplierCode: null,
      createdAt: new Date('2026-01-01'),
      user: { _id: 'user-uuid-1' },
    };

    supplierRepository.save
      .mockResolvedValueOnce(savedSupplier)
      .mockResolvedValueOnce({
        ...savedSupplier,
        supplierCode: 'Sup-2026-00001',
      });

    userRepository.save.mockResolvedValue({
      ...mockUser,
      supplierId: 'sup-uuid-1',
    });

    const command = new RegisterSupplierCommand(1, validInput);
    const result = await handler.execute(command);

    expect(result.supplier).toBeDefined();

    const firstSaveCall = supplierRepository.save.mock.calls[0][0];
    expect(firstSaveCall.isVerified).toBe(false);
    expect(firstSaveCall.verificationStatus).toBe(
      SupplierVerificationStatus.PENDING,
    );
  });

  it('does NOT set verificationStatus=APPROVED on registration', async () => {
    supplierRepository.findByUserId.mockResolvedValue(null);
    supplierRepository.findByRegistrationNumber.mockResolvedValue(null);
    userRepository.findById.mockResolvedValue(mockUser);

    const savedSupplier = {
      id: 1,
      _id: 'sup-uuid-1',
      userId: 1,
      companyName: 'Acme Corp',
      isVerified: false,
      verificationStatus: SupplierVerificationStatus.PENDING,
      supplierCode: null,
      createdAt: new Date('2026-01-01'),
      user: { _id: 'user-uuid-1' },
    };

    supplierRepository.save
      .mockResolvedValueOnce(savedSupplier)
      .mockResolvedValueOnce({
        ...savedSupplier,
        supplierCode: 'Sup-2026-00001',
      });

    userRepository.save.mockResolvedValue({
      ...mockUser,
      supplierId: 'sup-uuid-1',
    });

    const command = new RegisterSupplierCommand(1, validInput);
    await handler.execute(command);

    const firstSaveCall = supplierRepository.save.mock.calls[0][0];
    expect(firstSaveCall.verificationStatus).not.toBe(
      SupplierVerificationStatus.APPROVED,
    );
    expect(firstSaveCall.isVerified).not.toBe(true);
  });

  it('throws ConflictException when supplier already exists for the user', async () => {
    supplierRepository.findByUserId.mockResolvedValue({ id: 99 });

    await expect(
      handler.execute(new RegisterSupplierCommand(1, validInput)),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws ConflictException when registration number is taken', async () => {
    supplierRepository.findByUserId.mockResolvedValue(null);
    supplierRepository.findByRegistrationNumber.mockResolvedValue({ id: 99 });

    await expect(
      handler.execute(new RegisterSupplierCommand(1, validInput)),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws NotFoundException when user is not found', async () => {
    supplierRepository.findByUserId.mockResolvedValue(null);
    supplierRepository.findByRegistrationNumber.mockResolvedValue(null);
    userRepository.findById.mockResolvedValue(null);

    await expect(
      handler.execute(new RegisterSupplierCommand(1, validInput)),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws ForbiddenException when user is a buyer', async () => {
    supplierRepository.findByUserId.mockResolvedValue(null);
    supplierRepository.findByRegistrationNumber.mockResolvedValue(null);
    userRepository.findById.mockResolvedValue({
      ...mockUser,
      role: UserRole.BUYER,
    });

    await expect(
      handler.execute(new RegisterSupplierCommand(1, validInput)),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
