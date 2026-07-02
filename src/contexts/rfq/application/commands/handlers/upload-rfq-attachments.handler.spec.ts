import { ForbiddenException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { StorageService } from '../../../../../shared/infrastructure/services/storage.service';
import { RfqAttachmentOrmEntity } from '../../../infrastructure/persistence/rfq-attachment.orm-entity';
import {
  RfqAttachmentCapExceededException,
  RfqNotFoundException,
} from '../../../domain/rfq.exceptions';
import {
  RFQ_REPOSITORY,
  type IRfqRepository,
} from '../../../domain/rfq.repository.interface';
import { RfqStatus } from '../../../domain/rfq.types';
import { UploadRfqAttachmentsCommand } from '../upload-rfq-attachments.command';
import { UploadRfqAttachmentsHandler } from './upload-rfq-attachments.handler';

describe('UploadRfqAttachmentsHandler', () => {
  let handler: UploadRfqAttachmentsHandler;

  const rfqRepository: jest.Mocked<IRfqRepository> = {
    findByPublicId: jest.fn(),
    findByPublicIdWithRelations: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };

  const attachmentRepository = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const storageService = {
    storeFile: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadRfqAttachmentsHandler,
        { provide: RFQ_REPOSITORY, useValue: rfqRepository },
        {
          provide: getRepositoryToken(RfqAttachmentOrmEntity, 'write'),
          useValue: attachmentRepository,
        },
        { provide: StorageService, useValue: storageService },
      ],
    }).compile();

    handler = module.get(UploadRfqAttachmentsHandler);
  });

  it('uploads 2 files, saves 2 attachment rows, and returns the refreshed RFQ', async () => {
    const rfqFixture = {
      id: 10,
      _id: 'rfq-uuid',
      buyerId: 7,
      status: RfqStatus.OPEN,
      attachments: [],
    };

    rfqRepository.findByPublicId.mockResolvedValue(rfqFixture as never);
    storageService.storeFile
      .mockResolvedValueOnce('https://storage.example.com/rfq/file1.pdf')
      .mockResolvedValueOnce('https://storage.example.com/rfq/file2.png');
    attachmentRepository.create
      .mockReturnValueOnce({
        rfqId: 10,
        url: 'https://storage.example.com/rfq/file1.pdf',
      })
      .mockReturnValueOnce({
        rfqId: 10,
        url: 'https://storage.example.com/rfq/file2.png',
      });
    attachmentRepository.save.mockResolvedValue([]);

    const refreshedRfq = { ...rfqFixture, attachments: [{}, {}] };
    rfqRepository.findByPublicIdWithRelations.mockResolvedValue(
      refreshedRfq as never,
    );

    const command = new UploadRfqAttachmentsCommand('rfq-uuid', 7, [
      {
        buffer: Buffer.from('pdf-content'),
        originalName: 'invoice.pdf',
        mimeType: 'application/pdf',
      },
      {
        buffer: Buffer.from('png-content'),
        originalName: 'photo.png',
        mimeType: 'image/png',
      },
    ]);

    const result = await handler.execute(command);

    expect(storageService.storeFile.mock.calls).toHaveLength(2);
    expect(attachmentRepository.create.mock.calls).toHaveLength(2);
    expect(attachmentRepository.save.mock.calls).toHaveLength(1);
    expect(rfqRepository.findByPublicIdWithRelations.mock.calls[0]?.[0]).toBe(
      'rfq-uuid',
    );
    expect(result).toBe(refreshedRfq);
  });

  it('throws RfqNotFoundException when the RFQ does not exist', async () => {
    rfqRepository.findByPublicId.mockResolvedValue(null);

    const command = new UploadRfqAttachmentsCommand('nonexistent-id', 7, [
      {
        buffer: Buffer.from('data'),
        originalName: 'file.pdf',
        mimeType: 'application/pdf',
      },
    ]);

    await expect(handler.execute(command)).rejects.toBeInstanceOf(
      RfqNotFoundException,
    );
    expect(storageService.storeFile.mock.calls).toHaveLength(0);
  });

  it('throws ForbiddenException when the caller is not the RFQ buyer', async () => {
    rfqRepository.findByPublicId.mockResolvedValue({
      id: 10,
      _id: 'rfq-uuid',
      buyerId: 99,
      status: RfqStatus.OPEN,
      attachments: [],
    } as never);

    const command = new UploadRfqAttachmentsCommand('rfq-uuid', 7, [
      {
        buffer: Buffer.from('data'),
        originalName: 'file.pdf',
        mimeType: 'application/pdf',
      },
    ]);

    await expect(handler.execute(command)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(storageService.storeFile.mock.calls).toHaveLength(0);
  });

  it('throws RfqAttachmentCapExceededException when uploading would exceed 10 attachments', async () => {
    const existingAttachments = Array.from({ length: 9 }, (_, i) => ({
      id: i + 1,
    }));

    rfqRepository.findByPublicId.mockResolvedValue({
      id: 10,
      _id: 'rfq-uuid',
      buyerId: 7,
      status: RfqStatus.OPEN,
      attachments: existingAttachments,
    } as never);

    const command = new UploadRfqAttachmentsCommand('rfq-uuid', 7, [
      {
        buffer: Buffer.from('file1'),
        originalName: 'file1.pdf',
        mimeType: 'application/pdf',
      },
      {
        buffer: Buffer.from('file2'),
        originalName: 'file2.pdf',
        mimeType: 'application/pdf',
      },
    ]);

    await expect(handler.execute(command)).rejects.toBeInstanceOf(
      RfqAttachmentCapExceededException,
    );
    expect(storageService.storeFile.mock.calls).toHaveLength(0);
  });
});
