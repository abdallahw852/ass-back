import type { Provider } from '@nestjs/common';
import { GetRfqDetailHandler } from './get-rfq-detail.handler';
import { ListAssignedRfqsHandler } from './list-assigned-rfqs.handler';
import { ListBuyerRfqsHandler } from './list-buyer-rfqs.handler';
import { ListMarketRfqsHandler } from './list-market-rfqs.handler';
import { ListSupplierQuotationsHandler } from './list-supplier-quotations.handler';

export * from './get-rfq-detail.handler';
export * from './list-assigned-rfqs.handler';
export * from './list-buyer-rfqs.handler';
export * from './list-market-rfqs.handler';
export * from './list-supplier-quotations.handler';

export const QueryHandlers: Provider[] = [
  ListBuyerRfqsHandler,
  GetRfqDetailHandler,
  ListMarketRfqsHandler,
  ListAssignedRfqsHandler,
  ListSupplierQuotationsHandler,
];
