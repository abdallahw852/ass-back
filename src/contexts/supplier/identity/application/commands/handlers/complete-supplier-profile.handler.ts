import { ForbiddenException, Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CompleteSupplierProfileCommand } from '../complete-supplier-profile.command';
import { SUPPLIER_REPOSITORY } from '../../../domain/repositories/supplier.repository.interface';
import type { ISupplierRepository } from '../../../domain/repositories/supplier.repository.interface';
import { SUBSCRIPTION_REPOSITORY } from '../../../../subscription/domain/subscription.repository.interface';
import type { ISubscriptionRepository } from '../../../../subscription/domain/subscription.repository.interface';
import { USER_REPOSITORY } from '../../../../../auth/domain/repositories/user.repository.interface';
import type { IUserRepository } from '../../../../../auth/domain/repositories/user.repository.interface';
import { SupplierVerificationStatus } from '../../../domain/enums/supplier-verification-status.enum';

@CommandHandler(CompleteSupplierProfileCommand)
export class CompleteSupplierProfileHandler implements ICommandHandler<
  CompleteSupplierProfileCommand,
  unknown
> {
  constructor(
    @Inject(SUPPLIER_REPOSITORY)
    private readonly supplierRepository: ISupplierRepository,
    @Inject(SUBSCRIPTION_REPOSITORY)
    private readonly subscriptionRepository: ISubscriptionRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(command: CompleteSupplierProfileCommand): Promise<unknown> {
    const supplier = await this.supplierRepository.findByUserId(command.userId);
    if (!supplier) throw new NotFoundException('Supplier profile not found.');

    const subscription = await this.subscriptionRepository.findBySupplierId(
      supplier.id,
    );
    if (!subscription || subscription.status !== 'active') {
      throw new ForbiddenException(
        'An active subscription plan is required before completing your profile.',
      );
    }

    const { input } = command;

    if (input.companyNameAr !== undefined)
      supplier.companyNameAr = input.companyNameAr;
    if (input.companyNameEn !== undefined)
      supplier.companyNameEn = input.companyNameEn;
    if (input.taxNumber !== undefined) supplier.taxNumber = input.taxNumber;
    if (input.ownerName !== undefined) supplier.ownerName = input.ownerName;
    if (input.nationalId !== undefined) supplier.nationalId = input.nationalId;
    if (input.city !== undefined) supplier.city = input.city;
    if (input.detailedAddress !== undefined)
      supplier.detailedAddress = input.detailedAddress;
    if (input.bankName !== undefined) supplier.bankName = input.bankName;
    if (input.iban !== undefined) supplier.iban = input.iban;
    if (input.accountHolderName !== undefined)
      supplier.accountHolderName = input.accountHolderName;
    if (input.businessDescription !== undefined)
      supplier.businessDescription = input.businessDescription;
    if (input.logoUrl !== undefined) supplier.logoUrl = input.logoUrl;
    if (input.galleryUrls !== undefined)
      supplier.galleryUrls = input.galleryUrls;

    supplier.verificationStatus = SupplierVerificationStatus.PROFILE_COMPLETED;
    supplier.isVerified = false;

    const saved = await this.supplierRepository.save(supplier);

    // Profile completion is the final supplier onboarding step — mark the
    // account fully onboarded so re-registration is blocked from here on.
    await this.userRepository.markOnboardingCompleted(
      command.userId,
      new Date(),
    );

    const { user: supplierUser, ...supplierData } = saved;
    return { ...supplierData, userId: supplierUser?._id ?? supplier.userId };
  }
}
