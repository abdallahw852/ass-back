import { Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UpdateBusinessInfoCommand } from '../update-business-info.command';
import { SUPPLIER_REPOSITORY } from '../../../domain/repositories/supplier.repository.interface';
import type { ISupplierRepository } from '../../../domain/repositories/supplier.repository.interface';
import type { SupplierOrmEntity } from '../../../infrastructure/persistence/supplier.orm-entity';

@CommandHandler(UpdateBusinessInfoCommand)
export class UpdateBusinessInfoHandler implements ICommandHandler<
  UpdateBusinessInfoCommand,
  SupplierOrmEntity
> {
  constructor(
    @Inject(SUPPLIER_REPOSITORY)
    private readonly supplierRepository: ISupplierRepository,
  ) {}

  async execute(
    command: UpdateBusinessInfoCommand,
  ): Promise<SupplierOrmEntity> {
    const supplier = await this.supplierRepository.findByUserId(command.userId);
    if (!supplier) throw new NotFoundException('Supplier profile not found.');

    const { input } = command;

    if (input.companyName !== undefined)
      supplier.companyName = input.companyName;
    if (input.registrationNumber !== undefined)
      supplier.registrationNumber = input.registrationNumber;
    if (input.taxNumber !== undefined) supplier.taxNumber = input.taxNumber;
    if (input.activityType !== undefined)
      supplier.activityType = input.activityType;
    if (input.businessSize !== undefined)
      supplier.businessSize = input.businessSize;
    if (input.yearEstablished !== undefined)
      supplier.yearEstablished = input.yearEstablished;
    if (input.detailedAddress !== undefined)
      supplier.detailedAddress = input.detailedAddress;
    if (input.businessDescription !== undefined)
      supplier.businessDescription = input.businessDescription;
    if (input.latitude !== undefined) supplier.latitude = input.latitude;
    if (input.longitude !== undefined) supplier.longitude = input.longitude;
    if (input.removeLogo) {
      supplier.logoUrl = null;
    } else if (input.logoUrl !== undefined) {
      supplier.logoUrl = input.logoUrl;
    }

    return this.supplierRepository.save(supplier);
  }
}
