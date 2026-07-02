import type { Provider } from '@nestjs/common';
import { MarkConversationReadHandler } from './mark-conversation-read.handler';
import { OpenConversationHandler } from './open-conversation.handler';
import { SendMessageHandler } from './send-message.handler';

export * from './mark-conversation-read.handler';
export * from './open-conversation.handler';
export * from './send-message.handler';

export const CommandHandlers: Provider[] = [
  OpenConversationHandler,
  SendMessageHandler,
  MarkConversationReadHandler,
];
