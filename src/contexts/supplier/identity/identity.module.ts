import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { SupplierController } from './presentation/supplier.controller';
import { SupplierOrmEntity } from './infrastructure/persistence/supplier.orm-entity';
import { SupplierDocumentOrmEntity } from './infrastructure/persistence/supplier-document.orm-entity';
import { SupplierRepository } from './infrastructure/persistence/supplier.repository';
import { SupplierDocumentRepository } from './infrastructure/persistence/supplier-document.repository';
import { SUPPLIER_REPOSITORY } from './domain/repositories/supplier.repository.interface';
import { SUPPLIER_DOCUMENT_REPOSITORY } from './domain/repositories/supplier-document.repository.interface';
import { RegisterSupplierHandler } from './application/commands/handlers/register-supplier.handler';
import { CompleteSupplierProfileHandler } from './application/commands/handlers/complete-supplier-profile.handler';
import { UploadSupplierDocumentHandler } from './application/commands/handlers/upload-supplier-document.handler';
import { UpdateBusinessInfoHandler } from './application/commands/handlers/update-business-info.handler';
import { GetSupplierHandler } from './application/queries/handlers/get-supplier.handler';
import { GetSupplierDocumentsHandler } from './application/queries/handlers/get-supplier-documents.handler';
import { GetCurrentSupplierHandler } from './application/queries/handlers/get-current-supplier.handler';
import { ListSuppliersHandler } from './application/queries/handlers/list-suppliers.handler';
import { ApproveOrRejectSupplierHandler } from './application/commands/handlers/approve-or-reject-supplier.handler';
import { AuthModule } from '../../auth/auth.module';
import { SharedModule } from '../../../shared/shared.module';
import { SubscriptionModule } from '../subscription/subscription.module';
import { AuditLogModule } from '../../audit-log/audit-log.module';

@Module({
  imports: [
    CqrsModule,
    SharedModule,
    AuditLogModule,
    AuthModule,
    SubscriptionModule,
    TypeOrmModule.forFeature(
      [SupplierOrmEntity, SupplierDocumentOrmEntity],
      'write',
    ),
  ],
  controllers: [SupplierController],
  providers: [
    RegisterSupplierHandler,
    CompleteSupplierProfileHandler,
    UploadSupplierDocumentHandler,
    UpdateBusinessInfoHandler,
    GetSupplierHandler,
    GetSupplierDocumentsHandler,
    GetCurrentSupplierHandler,
    ListSuppliersHandler,
    ApproveOrRejectSupplierHandler,
    SupplierRepository,
    SupplierDocumentRepository,
    { provide: SUPPLIER_REPOSITORY, useExisting: SupplierRepository },
    {
      provide: SUPPLIER_DOCUMENT_REPOSITORY,
      useExisting: SupplierDocumentRepository,
    },
  ],
  exports: [{ provide: SUPPLIER_REPOSITORY, useExisting: SupplierRepository }],
})
export class SupplierModule {}
