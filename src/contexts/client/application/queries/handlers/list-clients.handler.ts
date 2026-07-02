import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { IClientReadRepository } from '../../../domain/client-read.repository.interface';
import { CLIENT_READ_REPOSITORY } from '../../../domain/client-read.repository.interface';
import {
  ClientClassification,
  ClientClassificationVo,
} from '../../../domain/value-objects/client-classification.vo';
import {
  ClientActivityStatus,
  ClientActivityStatusVo,
} from '../../../domain/value-objects/client-activity-status.vo';
import { CreditTermsVo } from '../../../domain/value-objects/credit-terms.vo';
import { ListClientsQuery } from '../list-clients.query';

@QueryHandler(ListClientsQuery)
export class ListClientsHandler implements IQueryHandler<ListClientsQuery> {
  constructor(
    @Inject(CLIENT_READ_REPOSITORY)
    private readonly repo: IClientReadRepository,
  ) {}

  async execute(query: ListClientsQuery) {
    const { supplierId, filters } = query;
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;

    const [
      { items: rawItems, total: orderTotal },
      { items: manualLeads, total: manualTotal },
      summary,
    ] = await Promise.all([
      this.repo.listSupplierClients(supplierId, { ...filters, page, limit }),
      this.repo.listManualClients(supplierId, filters),
      this.repo.getSummary(supplierId, filters),
    ]);

    const now = new Date();
    const orderItems = rawItems.map((client) => {
      const classification = ClientClassificationVo.derive({
        role: client.role,
        lifetimeValueSar: client.lifetimeValueSar,
        paidOrdersCount: client.ordersCount,
      });
      const activityStatus = ClientActivityStatusVo.derive({
        lastPaidOrderAt: client.lastOrderAt,
        now,
      });
      const creditTerms = CreditTermsVo.defaultTerms();
      const averageOrderValueSar =
        client.ordersCount > 0
          ? client.lifetimeValueSar / client.ordersCount
          : 0;
      const daysSinceLastOrder = client.lastOrderAt
        ? Math.floor(
            (now.getTime() - new Date(client.lastOrderAt).getTime()) /
              (1000 * 60 * 60 * 24),
          )
        : null;

      return {
        id: client.buyerPublicId,
        name: client.name,
        email: client.email,
        company: client.company,
        avatar: client.avatar,
        country: client.country,
        joinedAt: client.joinedAt,
        firstOrderAt: client.firstOrderAt,
        lastOrderAt: client.lastOrderAt,
        ordersCount: client.ordersCount,
        lifetimeValueSar: client.lifetimeValueSar,
        averageOrderValueSar,
        daysSinceLastOrder,
        classification,
        activityStatus,
        creditTerms,
      };
    });

    const defaultCreditTerms = CreditTermsVo.defaultTerms();
    const manualItems = manualLeads.map((lead) => ({
      id: lead.id,
      name: lead.fullName,
      email: lead.email,
      company: lead.companyName,
      avatar: null,
      country: lead.country,
      joinedAt: lead.createdAt,
      firstOrderAt: null,
      lastOrderAt: null,
      ordersCount: 0,
      lifetimeValueSar: 0,
      averageOrderValueSar: 0,
      daysSinceLastOrder: null,
      classification: lead.classification,
      activityStatus: ClientActivityStatus.INACTIVE,
      creditTerms: {
        creditLimitSar:
          lead.creditLimitSar ?? defaultCreditTerms.creditLimitSar,
        paymentTerms: lead.paymentTerms ?? defaultCreditTerms.paymentTerms,
      },
      isManual: true,
    }));

    // Manual leads are additive and fetched unpaginated; surface them on
    // page 1 alongside the SQL-paginated order-derived page so the
    // order-derived pagination math stays untouched.
    const items = page === 1 ? [...manualItems, ...orderItems] : orderItems;
    const total = orderTotal + manualTotal;
    const vipManualCount = manualItems.filter(
      (item) =>
        item.classification === ClientClassification.VIP ||
        item.classification === ClientClassification.AUTHORIZED_AGENT,
    ).length;

    return {
      items,
      total,
      page,
      limit,
      summary: {
        ...summary,
        totalClients: summary.totalClients + manualTotal,
        vipAndAgentCount: summary.vipAndAgentCount + vipManualCount,
      },
    };
  }
}
