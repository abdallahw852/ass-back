import {
  ConflictException,
  ForbiddenException,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { RegisterSupplierCommand } from '../register-supplier.command';
import { SUPPLIER_REPOSITORY } from '../../../domain/repositories/supplier.repository.interface';
import type { ISupplierRepository } from '../../../domain/repositories/supplier.repository.interface';
import { USER_REPOSITORY } from '../../../../../auth/domain/repositories/user.repository.interface';
import type { IUserRepository } from '../../../../../auth/domain/repositories/user.repository.interface';
import { SupplierAggregate } from '../../../domain/aggregates/supplier.aggregate';
import { CompanyName } from '../../../domain/value-objects/company-name.value-object';
import { RegistrationNumber } from '../../../domain/value-objects/registration-number.value-object';
import { UserRole } from '../../../../../auth/domain/enums/user-role.enum';
import { SupplierVerificationStatus } from '../../../domain/enums/supplier-verification-status.enum';

@CommandHandler(RegisterSupplierCommand)
export class RegisterSupplierHandler implements ICommandHandler<
  RegisterSupplierCommand,
  { supplier: unknown }
> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(SUPPLIER_REPOSITORY)
    private readonly supplierRepository: ISupplierRepository,
  ) {}

  async execute(
    command: RegisterSupplierCommand,
  ): Promise<{ supplier: unknown }> {
    const { userId, input } = command;

    const existingByUser = await this.supplierRepository.findByUserId(userId);
    if (existingByUser)
      throw new ConflictException(
        'Supplier profile already exists for this user.',
      );

    const registrationNumber = RegistrationNumber.create(
      input.registrationNumber,
    ).getValue();
    const existingSupplier =
      await this.supplierRepository.findByRegistrationNumber(
        registrationNumber,
      );
    if (existingSupplier)
      throw new ConflictException(
        'A supplier with this registration number already exists.',
      );

    // Ensure user role is set to supplier
    const user = await this.userRepository.findById(userId);
    if (!user) throw new NotFoundException('User not found.');
    if ((user.role as string) === (UserRole.BUYER as string))
      throw new ForbiddenException(
        'Buyers cannot register a supplier profile.',
      );
    if ((user.role as string) !== (UserRole.SUPPLIER as string)) {
      await this.userRepository.save({ ...user, role: UserRole.SUPPLIER });
    }

    const aggregate = SupplierAggregate.create(
      CompanyName.create(input.companyName),
    );
    const saved = await this.supplierRepository.save({
      _id: aggregate.id,
      userId,
      companyName: aggregate.getCompanyName(),
      phoneNumber: input.phoneNumber,
      country: input.country,
      activityType: input.activityType,
      businessSize: input.businessSize,
      registrationNumber,
      registrationFileUrl: input.registrationFileUrl,
      notes: input.notes ?? null,
      isVerified: false,
      verificationStatus: SupplierVerificationStatus.PENDING,
    });

    const year = new Date(saved.createdAt).getFullYear();
    const code = `Sup-${year}-${String(saved.id).padStart(5, '0')}`;
    const withCode = await this.supplierRepository.save({
      ...saved,
      supplierCode: code,
    });

    const { user: supplierUser, ...supplierData } = withCode;
    const supplier = { ...supplierData, userId: supplierUser?._id ?? user._id };

    await this.userRepository.save({ ...user, supplierId: supplier.id });

    return { supplier };
  }
}
