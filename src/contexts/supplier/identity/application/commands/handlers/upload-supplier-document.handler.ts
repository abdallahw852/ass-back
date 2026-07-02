import { Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UploadSupplierDocumentCommand } from '../upload-supplier-document.command';
import { SUPPLIER_REPOSITORY } from '../../../domain/repositories/supplier.repository.interface';
import type { ISupplierRepository } from '../../../domain/repositories/supplier.repository.interface';
import { SUPPLIER_DOCUMENT_REPOSITORY } from '../../../domain/repositories/supplier-document.repository.interface';
import type { ISupplierDocumentRepository } from '../../../domain/repositories/supplier-document.repository.interface';
import { SupplierDocumentOrmEntity } from '../../../infrastructure/persistence/supplier-document.orm-entity';
import { SupplierDocumentType } from '../../../domain/enums/supplier-document-type.enum';
import { SupplierVerificationStatus } from '../../../domain/enums/supplier-verification-status.enum';

const REQUIRED_DOCUMENT_TYPES: string[] = [
  SupplierDocumentType.COMMERCIAL_REGISTRATION,
  SupplierDocumentType.TAX_CARD,
];

@CommandHandler(UploadSupplierDocumentCommand)
export class UploadSupplierDocumentHandler implements ICommandHandler<
  UploadSupplierDocumentCommand,
  SupplierDocumentOrmEntity
> {
  constructor(
    @Inject(SUPPLIER_REPOSITORY)
    private readonly supplierRepository: ISupplierRepository,
    @Inject(SUPPLIER_DOCUMENT_REPOSITORY)
    private readonly documentRepository: ISupplierDocumentRepository,
  ) {}

  async execute(
    command: UploadSupplierDocumentCommand,
  ): Promise<SupplierDocumentOrmEntity> {
    const supplier = await this.supplierRepository.findByUserId(command.userId);
    if (!supplier) throw new NotFoundException('Supplier profile not found.');

    const savedDoc = await this.documentRepository.save({
      supplierId: supplier.id,
      documentType: command.documentType,
      documentName: command.documentName,
      fileUrl: command.fileUrl,
    });

    if (supplier.verificationStatus !== SupplierVerificationStatus.APPROVED) {
      const allDocs = await this.documentRepository.findBySupplierId(
        supplier.id,
      );
      const uploadedTypes = new Set(allDocs.map((d) => d.documentType));
      const hasAllRequired = REQUIRED_DOCUMENT_TYPES.every((t) =>
        uploadedTypes.has(t),
      );

      if (hasAllRequired) {
        await this.supplierRepository.save({
          id: supplier.id,
          verificationStatus: SupplierVerificationStatus.APPROVED,
          isVerified: true,
        });
      }
    }

    return savedDoc;
  }
}
