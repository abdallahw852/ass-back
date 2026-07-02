import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SharedModule } from '../../shared/shared.module';
import { PlanOrmEntity } from '../supplier/subscription/infrastructure/persistence/plan.orm-entity';
import { SubscriptionOrmEntity } from '../supplier/subscription/infrastructure/persistence/subscription.orm-entity';
import { SupplierOrmEntity } from '../supplier/identity/infrastructure/persistence/supplier.orm-entity';
import { EntitlementService } from './infrastructure/entitlement.service';
import { QuotaService } from './infrastructure/quota.service';
import { FeatureGuard } from './infrastructure/guards/feature.guard';
import { ENTITLEMENT_SERVICE } from './domain/entitlement.service.interface';

@Module({
  imports: [
    CqrsModule,
    SharedModule,
    TypeOrmModule.forFeature(
      [PlanOrmEntity, SubscriptionOrmEntity, SupplierOrmEntity],
      'write',
    ),
  ],
  providers: [
    EntitlementService,
    QuotaService,
    FeatureGuard,
    { provide: ENTITLEMENT_SERVICE, useExisting: EntitlementService },
  ],
  exports: [
    { provide: ENTITLEMENT_SERVICE, useExisting: EntitlementService },
    QuotaService,
    FeatureGuard,
  ],
})
export class EntitlementModule {}
