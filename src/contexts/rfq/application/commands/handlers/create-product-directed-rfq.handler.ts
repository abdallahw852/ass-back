import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { CreateProductDirectedRfqCommand } from '../create-product-directed-rfq.command';
import type { IRfqRepository } from '../../../domain/rfq.repository.interface';
import { RFQ_REPOSITORY } from '../../../domain/rfq.repository.interface';
import {
  ProductRfqProductNotFoundException,
  SupplierCannotRfqOwnProductException,
} from '../../../domain/rfq.exceptions';
import { RfqStatus, RfqType } from '../../../domain/rfq.types';
import { ProductStatus } from '../../../../product/domain/enums/product-status.enum';
import { ProductOrmEntity } from '../../../../product/infrastructure/persistence/product.orm-entity';
import { SupplierOrmEntity } from '../../../../supplier/identity/infrastructure/persistence/supplier.orm-entity';

@CommandHandler(CreateProductDirectedRfqCommand)
export class CreateProductDirectedRfqHandler implements ICommandHandler<CreateProductDirectedRfqCommand> {
  constructor(
    @Inject(RFQ_REPOSITORY)
    private readonly rfqRepository: IRfqRepository,
    @InjectRepository(ProductOrmEntity, 'write')
    private readonly productRepository: Repository<ProductOrmEntity>,
    @InjectRepository(SupplierOrmEntity, 'write')
    private readonly supplierRepository: Repository<SupplierOrmEntity>,
  ) {}

  async execute(
    command: CreateProductDirectedRfqCommand,
  ): Promise<Record<string, unknown>> {
    const product = await this.productRepository.findOne({
      where: { _id: command.productId },
    });

    if (!product || product.status !== ProductStatus.ACTIVE) {
      throw new ProductRfqProductNotFoundException(command.productId);
    }

    const supplier = await this.supplierRepository.findOne({
      where: { userId: command.buyerId },
    });

    if (supplier && supplier.id === product.supplierId) {
      throw new SupplierCannotRfqOwnProductException();
    }

    const saved = await this.rfqRepository.save({
      buyerId: command.buyerId,
      type: RfqType.PRODUCT_DIRECTED,
      status: RfqStatus.OPEN,
      productId: product.id,
      targetSupplierId: product.supplierId,
      productName: product.name,
      quantity: command.input.quantity,
      quantityUnit: command.input.quantityUnit ?? product.unitType ?? null,
      message: command.input.message ?? null,
      technicalSpecs: command.input.technicalSpecs ?? null,
      sampleReadiness: null,
      requestedDeliveryDate: command.input.requestedDeliveryDate ?? null,
      customizations: (command.input.customizations ?? []).map(
        (customization) => ({
          name: customization.name,
          value: customization.value,
        }),
      ),
      attachments: (command.input.attachments ?? []).map((attachment) => ({
        url: attachment.url,
        originalName: attachment.originalName,
        mimeType: attachment.mimeType,
        size: attachment.size,
      })),
    });

    return { rfq: saved };
  }
}
