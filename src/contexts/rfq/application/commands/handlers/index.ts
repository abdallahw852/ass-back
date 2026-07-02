import type { Provider } from '@nestjs/common';
import { AcceptQuotationHandler } from './accept-quotation.handler';
import { CancelQuotationHandler } from './cancel-quotation.handler';
import { CancelRfqHandler } from './cancel-rfq.handler';
import { CreateGeneralCustomRfqHandler } from './create-general-custom-rfq.handler';
import { CreateProductDirectedRfqHandler } from './create-product-directed-rfq.handler';
import { MarkRfqViewedHandler } from './mark-rfq-viewed.handler';
import {
  OpenRfqConversationAsBuyerHandler,
  OpenRfqConversationAsSupplierHandler,
} from './open-rfq-conversation.handler';
import { RejectQuotationHandler } from './reject-quotation.handler';
import { SubmitQuotationHandler } from './submit-quotation.handler';
import { UpdateQuotationHandler } from './update-quotation.handler';
import { UploadRfqAttachmentsHandler } from './upload-rfq-attachments.handler';

export * from './accept-quotation.handler';
export * from './cancel-quotation.handler';
export * from './cancel-rfq.handler';
export * from './create-general-custom-rfq.handler';
export * from './create-product-directed-rfq.handler';
export * from './mark-rfq-viewed.handler';
export * from './open-rfq-conversation.handler';
export * from './reject-quotation.handler';
export * from './submit-quotation.handler';
export * from './update-quotation.handler';
export * from './upload-rfq-attachments.handler';

export const CommandHandlers: Provider[] = [
  CreateProductDirectedRfqHandler,
  CreateGeneralCustomRfqHandler,
  SubmitQuotationHandler,
  UpdateQuotationHandler,
  CancelQuotationHandler,
  AcceptQuotationHandler,
  RejectQuotationHandler,
  CancelRfqHandler,
  MarkRfqViewedHandler,
  OpenRfqConversationAsBuyerHandler,
  OpenRfqConversationAsSupplierHandler,
  UploadRfqAttachmentsHandler,
];
