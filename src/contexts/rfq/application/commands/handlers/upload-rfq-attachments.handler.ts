import {
  BadRequestException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { StorageService } from '../../../../../shared/infrastructure/services/storage.service';
import { RfqAttachmentOrmEntity } from '../../../infrastructure/persistence/rfq-attachment.orm-entity';
import type { IRfqRepository } from '../../../domain/rfq.repository.interface';
import { RFQ_REPOSITORY } from '../../../domain/rfq.repository.interface';
import {
  RfqAttachmentCapExceededException,
  RfqAttachmentUploadFailedException,
  RfqNotFoundException,
} from '../../../domain/rfq.exceptions';
import { RfqStatus } from '../../../domain/rfq.types';
import { RfqOrmEntity } from '../../../infrastructure/persistence/rfq.orm-entity';
import { RFQ_ATTACHMENTS_PER_RFQ } from '../../../presentation/rfq-attachment.constraints';
import { UploadRfqAttachmentsCommand } from '../upload-rfq-attachments.command';

@CommandHandler(UploadRfqAttachmentsCommand)
export class UploadRfqAttachmentsHandler implements ICommandHandler<UploadRfqAttachmentsCommand> {
  constructor(
    @Inject(RFQ_REPOSITORY)
    private readonly rfqRepository: IRfqRepository,
    @InjectRepository(RfqAttachmentOrmEntity, 'write')
    private readonly attachmentRepository: Repository<RfqAttachmentOrmEntity>,
    private readonly storageService: StorageService,
  ) {}

  async execute(command: UploadRfqAttachmentsCommand): Promise<RfqOrmEntity> {
    const rfq = await this.rfqRepository.findByPublicId(command.rfqPublicId);

    if (!rfq) {
      throw new RfqNotFoundException(command.rfqPublicId);
    }

    if (rfq.buyerId !== command.buyerId) {
      throw new ForbiddenException(
        'Only the RFQ buyer can upload attachments.',
      );
    }

    if (rfq.status !== RfqStatus.OPEN) {
      throw new BadRequestException(
        'Attachments can only be added to open RFQs.',
      );
    }

    if (
      rfq.attachments.length + command.attachments.length >
      RFQ_ATTACHMENTS_PER_RFQ
    ) {
      throw new RfqAttachmentCapExceededException();
    }

    const uploadedAttachments: Array<{
      url: string;
      originalName: string;
      mimeType: string;
      size: number;
    }> = [];

    for (const file of command.attachments) {
      try {
        const url = await this.storageService.storeFile({
          buffer: file.buffer,
          originalName: file.originalName,
          mimeType: file.mimeType,
          destinationDir: 'uploads/rfq',
        });
        uploadedAttachments.push({
          url,
          originalName: file.originalName,
          mimeType: file.mimeType,
          size: file.buffer.length,
        });
      } catch {
        throw new RfqAttachmentUploadFailedException();
      }
    }

    const entities = uploadedAttachments.map((a) =>
      this.attachmentRepository.create({
        rfqId: rfq.id,
        url: a.url,
        originalName: a.originalName,
        mimeType: a.mimeType,
        size: a.size,
      }),
    );

    await this.attachmentRepository.save(entities);

    const updated = await this.rfqRepository.findByPublicIdWithRelations(
      command.rfqPublicId,
    );

    return updated as RfqOrmEntity;
  }
}
