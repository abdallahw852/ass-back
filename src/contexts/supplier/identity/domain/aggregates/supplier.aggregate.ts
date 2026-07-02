import { randomUUID } from 'node:crypto';
import { AggregateRoot } from '../../../../../shared/domain/aggregate-root';
import { SupplierRegisteredEvent } from '../events/supplier-registered.event';
import { CompanyName } from '../value-objects/company-name.value-object';
import { SupplierProfileEntity } from '../entities/supplier-profile.entity';

export class SupplierAggregate extends AggregateRoot {
  private supplierProfile!: SupplierProfileEntity;

  private constructor(id: string) {
    super(id);
  }

  static create(companyName: CompanyName): SupplierAggregate {
    const aggregate = new SupplierAggregate(randomUUID());
    aggregate.raiseEvent(
      SupplierRegisteredEvent.create({
        aggregateId: aggregate.id,
        version: aggregate.version + 1,
        companyName: companyName.getValue(),
      }),
    );
    return aggregate;
  }

  onSupplierRegisteredEvent(event: SupplierRegisteredEvent): void {
    this.supplierProfile = SupplierProfileEntity.create({
      companyName: event.companyName,
      isVerified: false,
    });
  }

  getCompanyName(): string {
    return this.supplierProfile.getCompanyName();
  }

  getIsVerified(): boolean {
    return this.supplierProfile.getIsVerified();
  }

  getAggregateType(): string {
    return 'Supplier';
  }
}
