import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { CategoryNotFoundException } from '../../../../category/domain/category.exceptions';
import { CreateGeneralCustomRfqCommand } from '../create-general-custom-rfq.command';
import type { IRfqRepository } from '../../../domain/rfq.repository.interface';
import { RFQ_REPOSITORY } from '../../../domain/rfq.repository.interface';
import { CategoryOrmEntity } from '../../../../category/infrastructure/persistence/category.orm-entity';
import { RfqStatus, RfqType } from '../../../domain/rfq.types';

@CommandHandler(CreateGeneralCustomRfqCommand)
export class CreateGeneralCustomRfqHandler implements ICommandHandler<CreateGeneralCustomRfqCommand> {
  constructor(
    @Inject(RFQ_REPOSITORY)
    private readonly rfqRepository: IRfqRepository,
    @InjectRepository(CategoryOrmEntity, 'write')
    private readonly categoryRepository: Repository<CategoryOrmEntity>,
  ) {}

  async execute(
    command: CreateGeneralCustomRfqCommand,
  ): Promise<Record<string, unknown>> {
    const category = command.input.categoryId
      ? await this.categoryRepository.findOne({
          where: { _id: command.input.categoryId },
        })
      : null;

    if (command.input.categoryId && !category) {
      throw new CategoryNotFoundException(command.input.categoryId);
    }

    const saved = await this.rfqRepository.save({
      buyerId: command.buyerId,
      type: RfqType.GENERAL_CUSTOM,
      status: RfqStatus.OPEN,
      categoryId: category?.id ?? null,
      productId: null,
      targetSupplierId: null,
      productName: command.input.productName,
      quantity: command.input.quantity,
      quantityUnit: command.input.quantityUnit ?? null,
      message: command.input.message ?? null,
      technicalSpecs: command.input.technicalSpecs ?? null,
      sampleReadiness: command.input.sampleReadiness ?? null,
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
