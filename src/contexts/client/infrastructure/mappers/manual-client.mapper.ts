import { ManualClient } from '../../domain/manual-client.entity';
import { ManualClientOrmEntity } from '../persistence/manual-client.orm-entity';
import { ClientActivityStatus } from '../../domain/value-objects/client-activity-status.vo';
import { CreditTermsVo } from '../../domain/value-objects/credit-terms.vo';

export class ManualClientMapper {
  static toDomain(orm: ManualClientOrmEntity): ManualClient {
    return ManualClient.reconstitute({
      _id: orm._id,
      internalId: orm.id,
      supplierId: orm.supplierId,
      companyName: orm.companyName,
      fullName: orm.fullName,
      email: orm.email,
      phone: orm.phone,
      country: orm.country,
      classification: orm.classification,
      creditLimitSar:
        orm.creditLimitSar !== null ? Number(orm.creditLimitSar) : null,
      paymentTerms: orm.paymentTerms,
      notes: orm.notes,
      createdAt: orm.createdAt,
      updatedAt: orm.updatedAt,
    });
  }

  static toOrm(domain: ManualClient): ManualClientOrmEntity {
    const orm = new ManualClientOrmEntity();
    if (domain.internalId !== null) orm.id = domain.internalId;
    orm._id = domain.id;
    orm.supplierId = domain.supplierId;
    orm.companyName = domain.companyName;
    orm.fullName = domain.fullName;
    orm.email = domain.email;
    orm.phone = domain.phone;
    orm.country = domain.country;
    orm.classification = domain.classification;
    orm.creditLimitSar = domain.creditLimitSar;
    orm.paymentTerms = domain.paymentTerms;
    orm.notes = domain.notes;
    return orm;
  }

  /** Maps to the same row shape ListClientsHandler produces for order-derived clients. */
  static toReadRow(domain: ManualClient): Record<string, unknown> {
    const defaultTerms = CreditTermsVo.defaultTerms();
    return {
      id: domain.id,
      name: domain.fullName,
      email: domain.email,
      company: domain.companyName,
      avatar: null,
      country: domain.country,
      joinedAt: domain.createdAt,
      firstOrderAt: null,
      lastOrderAt: null,
      ordersCount: 0,
      lifetimeValueSar: 0,
      averageOrderValueSar: 0,
      daysSinceLastOrder: null,
      classification: domain.classification,
      activityStatus: ClientActivityStatus.INACTIVE,
      creditTerms: {
        creditLimitSar: domain.creditLimitSar ?? defaultTerms.creditLimitSar,
        paymentTerms: domain.paymentTerms ?? defaultTerms.paymentTerms,
      },
      isManual: true,
    };
  }
}
