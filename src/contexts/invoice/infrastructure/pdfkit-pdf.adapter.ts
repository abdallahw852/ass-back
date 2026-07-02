import { Injectable, Logger } from '@nestjs/common';
import { StorageService } from '../../../shared/infrastructure/services/storage.service';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDFDocument = require('pdfkit') as typeof import('pdfkit');

export interface InvoicePdfData {
  invoiceNumber: string;
  orderId: string;
  referenceNumber: string | null;
  issuedAt: Date;
  buyerName: string;
  supplierName: string;
  lines: { name: string; quantity: number; unitPrice: number; total: number }[];
  subtotal: number;
  currency: string;
}

@Injectable()
export class PdfkitPdfAdapter {
  private readonly logger = new Logger(PdfkitPdfAdapter.name);

  constructor(private readonly storageService: StorageService) {}

  async generate(data: InvoicePdfData): Promise<string> {
    const buffer = await this.buildPdfBuffer(data);
    const key = `invoices/${data.invoiceNumber}.pdf`;

    try {
      const url = await this.storageService.upload({
        buffer,
        key,
        mimeType: 'application/pdf',
      });
      return url;
    } catch (err) {
      this.logger.warn('OCI upload failed, falling back to local storage', err);
      const localPath = await this.storageService.storeLocalFile({
        buffer,
        originalName: `${data.invoiceNumber}.pdf`,
        destinationDir: 'invoices',
      });
      return localPath;
    }
  }

  private buildPdfBuffer(data: InvoicePdfData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const { currency } = data;

      doc.fontSize(20).text('INVOICE', { align: 'right' });
      doc
        .fontSize(10)
        .text(`Invoice #: ${data.invoiceNumber}`, { align: 'right' });
      doc.text(`Order Ref: ${data.referenceNumber ?? data.orderId}`, {
        align: 'right',
      });
      doc.text(`Date: ${data.issuedAt.toLocaleDateString('en-SA')}`, {
        align: 'right',
      });
      doc.moveDown(2);

      doc
        .fontSize(11)
        .text('From:', { continued: true })
        .text(`   ${data.supplierName}`);
      doc.text('To:', { continued: true }).text(`     ${data.buyerName}`);
      doc.moveDown(2);

      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(0.5);
      doc
        .fontSize(10)
        .text('Item', 50, doc.y, { width: 190, continued: true })
        .text('Qty', 250, doc.y, { width: 85, continued: true })
        .text('Unit Price', 340, doc.y, { width: 85, continued: true })
        .text('Total', 430, doc.y, { width: 115 });
      doc.moveDown(0.5);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(0.5);

      for (const line of data.lines) {
        const y = doc.y;
        doc
          .fontSize(10)
          .text(line.name, 50, y, { width: 190, continued: true })
          .text(String(line.quantity), 250, y, { width: 85, continued: true })
          .text(`${line.unitPrice.toFixed(2)} ${currency}`, 340, y, {
            width: 85,
            continued: true,
          })
          .text(`${line.total.toFixed(2)} ${currency}`, 430, y, { width: 115 });
        doc.moveDown(0.5);
      }

      doc.moveDown(0.5);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(0.5);
      doc.fontSize(12).text(`Total: ${data.subtotal.toFixed(2)} ${currency}`, {
        align: 'right',
      });
      doc.moveDown(2);
      doc
        .fontSize(9)
        .fillColor('#888')
        .text('Thank you for your business.', { align: 'center' });

      doc.end();
    });
  }
}
