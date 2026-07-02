import { IsEnum, IsString, MaxLength } from 'class-validator';
import { SupplierDocumentType } from '../../domain/enums/supplier-document-type.enum';

export class UploadSupplierDocumentDto {
  @IsEnum(SupplierDocumentType, {
    message: `documentType must be one of: ${Object.values(SupplierDocumentType).join(', ')}`,
  })
  documentType: SupplierDocumentType;

  @IsString({ message: 'Document name is required.' })
  @MaxLength(255, { message: 'Document name must not exceed 255 characters.' })
  documentName: string;
}
