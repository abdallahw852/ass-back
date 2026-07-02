import { ListClientsHandler } from './list-clients.handler';
import { GetClientHandler } from './get-client.handler';
import { GetClientStatsHandler } from './get-client-stats.handler';
import { GetClientOrdersHandler } from './get-client-orders.handler';
import { GetClientQuotationsHandler } from './get-client-quotations.handler';
import { GetClientSampleRequestsHandler } from './get-client-sample-requests.handler';
import { GetClientChatThreadsHandler } from './get-client-chat-threads.handler';
import { GetClientNotesHandler } from './get-client-notes.handler';

export const QueryHandlers = [
  ListClientsHandler,
  GetClientHandler,
  GetClientStatsHandler,
  GetClientOrdersHandler,
  GetClientQuotationsHandler,
  GetClientSampleRequestsHandler,
  GetClientChatThreadsHandler,
  GetClientNotesHandler,
];
