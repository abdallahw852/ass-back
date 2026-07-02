import { Test, type TestingModule } from '@nestjs/testing';
import { CommandBus } from '@nestjs/cqrs';
import {
  QUOTATION_REPOSITORY,
  type IQuotationRepository,
} from '../../../domain/quotation.repository.interface';
import {
  RFQ_REPOSITORY,
  type IRfqRepository,
} from '../../../domain/rfq.repository.interface';
import { QuotationStatus, RfqStatus, RfqType } from '../../../domain/rfq.types';
import { AcceptQuotationCommand } from '../accept-quotation.command';
import { AcceptQuotationHandler } from './accept-quotation.handler';
import { CreateOrderDraftFromQuotationCommand } from '../../../../order/application/commands/create-order-draft-from-quotation.command';

describe('AcceptQuotationHandler', () => {
  let handler: AcceptQuotationHandler;

  const rfqRepository: jest.Mocked<IRfqRepository> = {
    findByPublicId: jest.fn(),
    findByPublicIdWithRelations: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };

  const quotationRepository: jest.Mocked<IQuotationRepository> = {
    findByPublicId: jest.fn(),
    findByPublicIdWithRelations: jest.fn(),
    findByRfqAndSupplier: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    rejectOtherSubmitted: jest.fn(),
  };

  const commandBus = {
    execute: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AcceptQuotationHandler,
        { provide: RFQ_REPOSITORY, useValue: rfqRepository },
        { provide: QUOTATION_REPOSITORY, useValue: quotationRepository },
        { provide: CommandBus, useValue: commandBus },
      ],
    }).compile();

    handler = module.get(AcceptQuotationHandler);
  });

  it('accepts a quotation and creates a draft order via CommandBus', async () => {
    const mockRfq = {
      id: 10,
      _id: 'rfq-public-id',
      buyerId: 7,
      referenceNumber: 'RFQ-2026-00010',
      type: RfqType.GENERAL_CUSTOM,
      status: RfqStatus.OPEN,
      productName: 'Screens',
      quantity: 500,
      quantityUnit: 'pieces',
      message: 'Need 500 screens',
      technicalSpecs: 'IPS panels',
      sampleReadiness: 'available',
      requestedDeliveryDate: '2026-10-22',
      customizations: [{ name: 'Color', value: 'Black' }],
    };

    const mockQuotation = {
      id: 20,
      _id: 'quotation-public-id',
      rfqId: 10,
      supplierId: 12,
      status: QuotationStatus.SUBMITTED,
      productName: 'Screens',
      quantity: 500,
      weightKg: 2,
      lengthCm: 20,
      widthCm: 20,
      heightCm: 20,
      unitPrice: 100,
      totalPrice: 50000,
      currency: 'SAR',
      deliveryTimeDays: '7-10',
      paymentTerms: '30% Advance Payment',
      validUntil: new Date('2026-10-22T00:00:00.000Z'),
      shippingDetails: 'Price includes shipping',
      additionalNotes: 'Packed safely',
      customizations: [{ name: 'Color', value: 'Black' }],
      supplier: { _id: 'supplier-public-id', companyName: 'ACME Supplies' },
    };

    rfqRepository.findByPublicIdWithRelations
      .mockResolvedValueOnce(mockRfq as never)
      .mockResolvedValueOnce({
        ...mockRfq,
        status: RfqStatus.AWARDED,
      } as never);

    quotationRepository.findByPublicIdWithRelations
      .mockResolvedValueOnce(mockQuotation as never)
      .mockResolvedValueOnce({
        ...mockQuotation,
        status: QuotationStatus.ACCEPTED,
      } as never);

    quotationRepository.update.mockResolvedValue(mockQuotation as never);
    quotationRepository.rejectOtherSubmitted.mockResolvedValue(undefined);
    rfqRepository.update.mockResolvedValue({
      ...mockRfq,
      status: RfqStatus.AWARDED,
    } as never);

    const mockOrderDraft = {
      id: 44,
      _id: 'order-public-id',
      rfqId: 'rfq-public-id',
      quotationId: 'quotation-public-id',
      subtotal: 50000,
      referenceNumber: 'ORD-2026-00044',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    commandBus.execute.mockResolvedValue(mockOrderDraft);

    const result = await handler.execute(
      new AcceptQuotationCommand('rfq-public-id', 'quotation-public-id', 7),
    );

    expect(quotationRepository.update.mock.calls[0]?.[0]).toBe(20);
    expect(quotationRepository.update.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({ status: QuotationStatus.ACCEPTED }),
    );

    expect(quotationRepository.rejectOtherSubmitted.mock.calls[0]).toEqual([
      10, 20,
    ]);

    expect(rfqRepository.update.mock.calls[0]?.[0]).toBe(10);
    expect(rfqRepository.update.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({
        status: RfqStatus.AWARDED,
        awardedQuotationId: 20,
      }),
    );

    expect(commandBus.execute.mock.calls).toHaveLength(1);
    const dispatchedCommand = commandBus.execute.mock
      .calls[0]?.[0] as CreateOrderDraftFromQuotationCommand;
    expect(dispatchedCommand).toBeInstanceOf(
      CreateOrderDraftFromQuotationCommand,
    );
    expect(dispatchedCommand.rfqId).toBe('rfq-public-id');
    expect(dispatchedCommand.quotationId).toBe('quotation-public-id');
    expect(dispatchedCommand.buyerId).toBe(7);
    expect(dispatchedCommand.supplierId).toBe(12);
    expect(dispatchedCommand.totalPrice).toBe(50000);
    expect(dispatchedCommand.currency).toBe('SAR');

    expect(result.order).toEqual(
      expect.objectContaining({
        _id: 'order-public-id',
        rfqId: 'rfq-public-id',
        quotationId: 'quotation-public-id',
        subtotal: 50000,
      }),
    );
    expect(
      (result.order as { referenceNumber: string }).referenceNumber,
    ).toMatch(/^ORD-\d{4}-\d{5}$/);
  });
});
