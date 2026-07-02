import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { SUPPLIER_REPOSITORY } from '../../../domain/repositories/supplier.repository.interface';
import { SUBSCRIPTION_REPOSITORY } from '../../../../subscription/domain/subscription.repository.interface';
import { USER_REPOSITORY } from '../../../../../auth/domain/repositories/user.repository.interface';
import { CompleteSupplierProfileCommand } from '../complete-supplier-profile.command';
import { CompleteSupplierProfileHandler } from './complete-supplier-profile.handler';
import { SupplierVerificationStatus } from '../../../domain/enums/supplier-verification-status.enum';

describe('CompleteSupplierProfileHandler', () => {
  let handler: CompleteSupplierProfileHandler;

  const supplierRepository = {
    findByUserId: jest.fn(),
    save: jest.fn(),
  };

  const subscriptionRepository = {
    findBySupplierId: jest.fn(),
  };

  const userRepository = {
    markOnboardingCompleted: jest.fn(),
  };

  const mockSupplier = {
    id: 1,
    _id: 'sup-uuid-1',
    userId: 1,
    companyName: 'Acme Corp',
    isVerified: false,
    verificationStatus: SupplierVerificationStatus.PENDING,
  };

  const mockSubscription = { id: 1, supplierId: 1, status: 'active' };

  const validInput = {
    companyNameAr: 'اكمي',
    companyNameEn: 'Acme Corp',
    taxNumber: 'TAX-001',
    ownerName: 'Ahmed',
    nationalId: 'NID-001',
    city: 'Riyadh',
    detailedAddress: '123 Main St',
    bankName: 'Al Rajhi',
    iban: 'SA44 2000 0001 2345 6789 1234',
    accountHolderName: 'Ahmed',
    businessDescription: 'Trading company',
    logoUrl: '/uploads/logo.png',
    galleryUrls: [],
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompleteSupplierProfileHandler,
        { provide: SUPPLIER_REPOSITORY, useValue: supplierRepository },
        { provide: SUBSCRIPTION_REPOSITORY, useValue: subscriptionRepository },
        { provide: USER_REPOSITORY, useValue: userRepository },
      ],
    }).compile();

    handler = module.get(CompleteSupplierProfileHandler);
  });

  it('saves the supplier with verificationStatus=PROFILE_COMPLETED and isVerified=false', async () => {
    const mutableSupplier = { ...mockSupplier };
    supplierRepository.findByUserId.mockResolvedValue(mutableSupplier);
    subscriptionRepository.findBySupplierId.mockResolvedValue(mockSubscription);
    userRepository.markOnboardingCompleted.mockResolvedValue(undefined);

    const savedSupplier = {
      ...mutableSupplier,
      verificationStatus: SupplierVerificationStatus.PROFILE_COMPLETED,
      isVerified: false,
      user: { _id: 'user-uuid-1' },
    };
    supplierRepository.save.mockResolvedValue(savedSupplier);

    const command = new CompleteSupplierProfileCommand(1, validInput as never);
    await handler.execute(command);

    const saveCall = supplierRepository.save.mock.calls[0][0];
    expect(saveCall.verificationStatus).toBe(
      SupplierVerificationStatus.PROFILE_COMPLETED,
    );
    expect(saveCall.isVerified).toBe(false);
  });

  it('throws NotFoundException when supplier profile does not exist', async () => {
    supplierRepository.findByUserId.mockResolvedValue(null);

    const command = new CompleteSupplierProfileCommand(99, validInput as never);
    await expect(handler.execute(command)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('throws ForbiddenException when supplier has no active subscription', async () => {
    supplierRepository.findByUserId.mockResolvedValue({ ...mockSupplier });
    subscriptionRepository.findBySupplierId.mockResolvedValue(null);

    const command = new CompleteSupplierProfileCommand(1, validInput as never);
    await expect(handler.execute(command)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('throws ForbiddenException when subscription is not active', async () => {
    supplierRepository.findByUserId.mockResolvedValue({ ...mockSupplier });
    subscriptionRepository.findBySupplierId.mockResolvedValue({
      ...mockSubscription,
      status: 'cancelled',
    });

    const command = new CompleteSupplierProfileCommand(1, validInput as never);
    await expect(handler.execute(command)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('marks onboarding completed after saving', async () => {
    const mutableSupplier = { ...mockSupplier };
    supplierRepository.findByUserId.mockResolvedValue(mutableSupplier);
    subscriptionRepository.findBySupplierId.mockResolvedValue(mockSubscription);
    supplierRepository.save.mockResolvedValue({
      ...mutableSupplier,
      verificationStatus: SupplierVerificationStatus.PROFILE_COMPLETED,
      isVerified: false,
      user: { _id: 'user-uuid-1' },
    });
    userRepository.markOnboardingCompleted.mockResolvedValue(undefined);

    const command = new CompleteSupplierProfileCommand(1, validInput as never);
    await handler.execute(command);

    expect(userRepository.markOnboardingCompleted).toHaveBeenCalledWith(
      1,
      expect.any(Date),
    );
  });
});
