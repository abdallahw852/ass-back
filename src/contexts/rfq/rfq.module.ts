import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SharedModule } from '../../shared/shared.module';
import { IsFullyVerifiedSupplier } from '../../shared/infrastructure/guards/is-fully-verified-supplier.guard';
import { CategoryOrmEntity } from '../category/infrastructure/persistence/category.orm-entity';
import { OrderModule } from '../order/order.module';
import { ProductOrmEntity } from '../product/infrastructure/persistence/product.orm-entity';
import { SupplierOrmEntity } from '../supplier/identity/infrastructure/persistence/supplier.orm-entity';
import { SupplierModule } from '../supplier/identity/identity.module';
import { EntitlementModule } from '../entitlement/entitlement.module';
import { SubscriptionOrmEntity } from '../supplier/subscription/infrastructure/persistence/subscription.orm-entity';
import { SubscriptionRepository } from '../supplier/subscription/infrastructure/subscription.repository';
import { SUBSCRIPTION_REPOSITORY } from '../supplier/subscription/domain/subscription.repository.interface';
import { CommandHandlers } from './application/commands/handlers';
import { QueryHandlers } from './application/queries/handlers';
import { QUOTATION_REPOSITORY } from './domain/quotation.repository.interface';
import { RFQ_READ_REPOSITORY } from './domain/rfq-read.repository.interface';
import { RFQ_REPOSITORY } from './domain/rfq.repository.interface';
import { QuotationRepository } from './infrastructure/quotation.repository';
import { RfqReadRepository } from './infrastructure/rfq-read.repository';
import { RfqRepository } from './infrastructure/rfq.repository';
import { QuotationCustomizationOrmEntity } from './infrastructure/persistence/quotation-customization.orm-entity';
import { QuotationOrmEntity } from './infrastructure/persistence/quotation.orm-entity';
import { RfqAttachmentOrmEntity } from './infrastructure/persistence/rfq-attachment.orm-entity';
import { RfqCustomizationOrmEntity } from './infrastructure/persistence/rfq-customization.orm-entity';
import { RfqOrmEntity } from './infrastructure/persistence/rfq.orm-entity';
import { RfqController } from './presentation/rfq.controller';

@Module({
  imports: [
    CqrsModule,
    SharedModule,
    SupplierModule,
    OrderModule,
    EntitlementModule,
    TypeOrmModule.forFeature(
      [
        RfqOrmEntity,
        RfqCustomizationOrmEntity,
        RfqAttachmentOrmEntity,
        QuotationOrmEntity,
        QuotationCustomizationOrmEntity,
        ProductOrmEntity,
        SupplierOrmEntity,
        CategoryOrmEntity,
        SubscriptionOrmEntity,
      ],
      'write',
    ),
  ],
  controllers: [RfqController],
  providers: [
    IsFullyVerifiedSupplier,
    ...CommandHandlers,
    ...QueryHandlers,
    RfqRepository,
    QuotationRepository,
    RfqReadRepository,
    SubscriptionRepository,
    { provide: RFQ_REPOSITORY, useExisting: RfqRepository },
    { provide: QUOTATION_REPOSITORY, useExisting: QuotationRepository },
    { provide: RFQ_READ_REPOSITORY, useExisting: RfqReadRepository },
    { provide: SUBSCRIPTION_REPOSITORY, useExisting: SubscriptionRepository },
    // Note: RfqReadRepository extends ReadModelRepositoryBase which injects ConnectionService.
    // ConnectionService is provided by SharedModule (already imported above).
  ],
  exports: [RFQ_REPOSITORY, QUOTATION_REPOSITORY, RFQ_READ_REPOSITORY],
})
export class RfqModule {}
