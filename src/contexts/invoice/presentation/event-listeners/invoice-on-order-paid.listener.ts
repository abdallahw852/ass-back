import { EventsHandler, type IEventHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { OrderPaidEvent } from '../../../order/domain/events/order-paid.event';
import { InvoiceRepository } from '../../infrastructure/invoice.repository';
import { PdfkitPdfAdapter } from '../../infrastructure/pdfkit-pdf.adapter';
import { TradeOrderOrmEntity } from '../../../order/infrastructure/persistence/trade-order.orm-entity';
import { UserOrmEntity } from '../../../auth/infrastructure/persistence/user.orm-entity';

@EventsHandler(OrderPaidEvent)
export class InvoiceOnOrderPaidListener implements IEventHandler<OrderPaidEvent> {
  private readonly logger = new Logger(InvoiceOnOrderPaidListener.name);

  constructor(
    private readonly invoiceRepo: InvoiceRepository,
    private readonly pdfAdapter: PdfkitPdfAdapter,
    @InjectRepository(TradeOrderOrmEntity, 'write')
    private readonly orderRepo: Repository<TradeOrderOrmEntity>,
    @InjectRepository(UserOrmEntity, 'write')
    private readonly userRepo: Repository<UserOrmEntity>,
  ) {}

  async handle(event: OrderPaidEvent): Promise<void> {
    try {
      const existing = await this.invoiceRepo.findByOrderId(
        event.orderInternalId,
      );
      if (existing) return;

      const order = await this.orderRepo.findOne({
        where: { _id: event.orderId },
      });
      if (!order) return;

      const [buyer, supplier] = await Promise.all([
        this.userRepo.findOne({ where: { id: event.buyerId } }),
        this.userRepo.findOne({ where: { id: event.supplierId } }),
      ]);

      const invoiceNumber = `INV-${Date.now()}`;
      const lines = (order.lines as any[]).map((l) => ({
        name: String(l.name ?? l.productName ?? 'Item'),
        quantity: Number(l.quantity ?? 1),
        unitPrice: Number(l.unitPrice ?? l.unit_price ?? 0),
        total: Number(l.total ?? 0),
      }));

      const invoice = await this.invoiceRepo.save({
        _id: randomUUID(),
        order_id: event.orderInternalId,
        invoice_number: invoiceNumber,
        pdf_url: null,
        total: event.amount,
        currency: event.currency,
      });

      const pdfUrl = await this.pdfAdapter.generate({
        invoiceNumber,
        orderId: event.orderId,
        referenceNumber: order.reference_number,
        issuedAt: new Date(),
        buyerName: buyer?.name ?? `Buyer #${event.buyerId}`,
        supplierName: supplier?.name ?? `Supplier #${event.supplierId}`,
        lines,
        subtotal: event.amount,
        currency: event.currency,
      });

      await this.invoiceRepo.updatePdfUrl(invoice.id, pdfUrl);
    } catch (err) {
      this.logger.error(
        `Failed to generate invoice for order ${event.orderId}`,
        err,
      );
    }
  }
}
