import type { Provider } from '@nestjs/common';
import { GetConversationHandler } from './get-conversation.handler';
import { ListMessagesHandler } from './list-messages.handler';
import { ListMyConversationsHandler } from './list-my-conversations.handler';

export * from './get-conversation.handler';
export * from './list-messages.handler';
export * from './list-my-conversations.handler';

export const QueryHandlers: Provider[] = [
  ListMyConversationsHandler,
  GetConversationHandler,
  ListMessagesHandler,
];
