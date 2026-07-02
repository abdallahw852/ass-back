import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { SessionAuthGuard } from '../../../shared/infrastructure/guards/session-auth.guard';
import { InvoiceRepository } from '../infrastructure/invoice.repository';
import { StorageService } from '../../../shared/infrastructure/services/storage.service';

@UseGuards(SessionAuthGuard)
@Controller('invoices')
export class InvoiceController {
  constructor(
    private readonly invoiceRepo: InvoiceRepository,
    private readonly storageService: StorageService,
  ) {}

  @Get('orders/:orderInternalId')
  async getInvoiceDownloadUrl(
    @Param('orderInternalId') orderInternalId: string,
    @Req() req: FastifyRequest,
  ): Promise<{ url: string }> {
    const invoice = await this.invoiceRepo.findByOrderId(
      Number(orderInternalId),
    );
    if (!invoice || !invoice.pdf_url) {
      throw new NotFoundException('Invoice not found or not yet generated.');
    }
    const url = await this.storageService.getSignedUrl({
      url: invoice.pdf_url,
      expiresIn: 3600,
    });
    return { url };
  }
}
