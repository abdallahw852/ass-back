import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvoiceController } from './presentation/invoice.controller';
import { InvoiceRepository } from './infrastructure/invoice.repository';
import { PdfkitPdfAdapter } from './infrastructure/pdfkit-pdf.adapter';
import { InvoiceOrmEntity } from './infrastructure/persistence/invoice.orm-entity';
import { InvoiceOnOrderPaidListener } from './presentation/event-listeners/invoice-on-order-paid.listener';
import { TradeOrderOrmEntity } from '../order/infrastructure/persistence/trade-order.orm-entity';
import { UserOrmEntity } from '../auth/infrastructure/persistence/user.orm-entity';
import { SharedModule } from '../../shared/shared.module';

@Module({
  imports: [
    CqrsModule,
    SharedModule,
    TypeOrmModule.forFeature(
      [InvoiceOrmEntity, TradeOrderOrmEntity, UserOrmEntity],
      'write',
    ),
  ],
  controllers: [InvoiceController],
  providers: [InvoiceRepository, PdfkitPdfAdapter, InvoiceOnOrderPaidListener],
})
export class InvoiceModule {}
