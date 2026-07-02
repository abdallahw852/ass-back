import { Test, type TestingModule } from '@nestjs/testing';
import {
  SUPPLIER_REPOSITORY,
  type ISupplierRepository,
} from '../../../../supplier/identity/domain/repositories/supplier.repository.interface';
import {
  QUOTATION_REPOSITORY,
  type IQuotationRepository,
} from '../../../domain/quotation.repository.interface';
import {
  InvalidDirectedRfqSupplierException,
  RfqClosedException,
} from '../../../domain/rfq.exceptions';
import {
  RFQ_REPOSITORY,
  type IRfqRepository,
} from '../../../domain/rfq.repository.interface';
import { SUBSCRIPTION_REPOSITORY } from '../../../../supplier/subscription/domain/subscription.repository.interface';
import { ENTITLEMENT_SERVICE } from '../../../../entitlement/domain/entitlement.service.interface';
import { QuotaService } from '../../../../entitlement/infrastructure/quota.service';
import { QuotationStatus, RfqStatus, RfqType } from '../../../domain/rfq.types';
import { SubmitQuotationCommand } from '../submit-quotation.command';
import { SubmitQuotationHandler } from './submit-quotation.handler';

describe('SubmitQuotationHandler', () => {
  let handler: SubmitQuotationHandler;

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

  const supplierRepository: jest.Mocked<ISupplierRepository> = {
    findByUserId: jest.fn(),
    findByRegistrationNumber: jest.fn(),
    findByPublicId: jest.fn(),
    save: jest.fn(),
    findManyForListing: jest.fn(),
  };

  const subscriptionRepository = {
    findBySupplierId: jest.fn().mockResolvedValue(null),
    findById: jest.fn(),
    findActiveByPlanId: jest.fn(),
    findCancellingExpired: jest.fn(),
    save: jest.fn(),
  };

  const entitlementService = {
    getEntitlements: jest.fn().mockResolvedValue({}),
    can: jest.fn().mockResolvedValue(true),
    getLimit: jest.fn().mockResolvedValue(-1),
    invalidateBySupplier: jest.fn(),
    invalidateAll: jest.fn(),
  };

  const quotaService = { assertWithinQuota: jest.fn() };

  const quotationRepositoryWithCount: jest.Mocked<IQuotationRepository> & {
    countSupplierQuotationsInPeriod: jest.Mock;
  } = {
    ...quotationRepository,
    countSupplierQuotationsInPeriod: jest.fn().mockResolvedValue(0),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    entitlementService.getLimit.mockResolvedValue(-1);
    subscriptionRepository.findBySupplierId.mockResolvedValue(null);
    quotationRepositoryWithCount.countSupplierQuotationsInPeriod.mockResolvedValue(
      0,
    );
    quotaService.assertWithinQuota.mockImplementation(() => {});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubmitQuotationHandler,
        { provide: RFQ_REPOSITORY, useValue: rfqRepository },
        {
          provide: QUOTATION_REPOSITORY,
          useValue: quotationRepositoryWithCount,
        },
        { provide: SUPPLIER_REPOSITORY, useValue: supplierRepository },
        { provide: SUBSCRIPTION_REPOSITORY, useValue: subscriptionRepository },
        { provide: ENTITLEMENT_SERVICE, useValue: entitlementService },
        { provide: QuotaService, useValue: quotaService },
      ],
    }).compile();

    handler = module.get(SubmitQuotationHandler);
  });

  it('submits a quotation for the assigned supplier on a directed RFQ', async () => {
    supplierRepository.findByUserId.mockResolvedValue({
      id: 22,
      _id: 'supplier-public-id',
    } as never);
    rfqRepository.findByPublicIdWithRelations.mockResolvedValue({
      id: 10,
      _id: 'rfq-public-id',
      status: RfqStatus.OPEN,
      type: RfqType.PRODUCT_DIRECTED,
      targetSupplierId: 22,
    } as never);
    quotationRepository.findByRfqAndSupplier.mockResolvedValue(null);
    quotationRepository.save.mockResolvedValue({
      _id: 'quotation-public-id',
      status: QuotationStatus.SUBMITTED,
      supplierId: 22,
      productName: 'Screens',
    } as never);

    const command = new SubmitQuotationCommand('rfq-public-id', 9, {
      productName: 'Screens',
      quantity: 500,
      unitPrice: 100,
      totalPrice: 50000,
      deliveryTimeDays: '7-10',
      paymentTerms: '30% Advance Payment',
      validUntil: '2026-10-22T00:00:00.000Z',
    });

    const result = (await handler.execute(command)) as {
      quotation: { _id: string; supplierId: number };
    };

    expect(result.quotation).toMatchObject({
      _id: 'quotation-public-id',
      supplierId: 22,
    });

    expect(quotationRepository.save.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        rfqId: 10,
        supplierId: 22,
        status: QuotationStatus.SUBMITTED,
        productName: 'Screens',
        currency: 'SAR',
      }),
    );
  });

  it('rejects non-assigned suppliers on directed RFQs', async () => {
    supplierRepository.findByUserId.mockResolvedValue({
      id: 31,
      _id: 'supplier-public-id',
    } as never);
    rfqRepository.findByPublicIdWithRelations.mockResolvedValue({
      id: 10,
      _id: 'rfq-public-id',
      status: RfqStatus.OPEN,
      type: RfqType.PRODUCT_DIRECTED,
      targetSupplierId: 22,
    } as never);

    const command = new SubmitQuotationCommand('rfq-public-id', 9, {
      productName: 'Screens',
      quantity: 500,
      unitPrice: 100,
      totalPrice: 50000,
      deliveryTimeDays: '7-10',
      paymentTerms: '30% Advance Payment',
      validUntil: '2026-10-22T00:00:00.000Z',
    });

    await expect(handler.execute(command)).rejects.toBeInstanceOf(
      InvalidDirectedRfqSupplierException,
    );
    expect(quotationRepository.save.mock.calls).toHaveLength(0);
  });

  it('rejects quotations for closed RFQs', async () => {
    supplierRepository.findByUserId.mockResolvedValue({
      id: 22,
      _id: 'supplier-public-id',
    } as never);
    rfqRepository.findByPublicIdWithRelations.mockResolvedValue({
      id: 10,
      _id: 'rfq-public-id',
      status: RfqStatus.CLOSED,
      type: RfqType.GENERAL_CUSTOM,
      targetSupplierId: null,
    } as never);

    const command = new SubmitQuotationCommand('rfq-public-id', 9, {
      productName: 'Screens',
      quantity: 500,
      unitPrice: 100,
      totalPrice: 50000,
      deliveryTimeDays: '7-10',
      paymentTerms: '30% Advance Payment',
      validUntil: '2026-10-22T00:00:00.000Z',
    });

    await expect(handler.execute(command)).rejects.toBeInstanceOf(
      RfqClosedException,
    );
    expect(quotationRepository.save.mock.calls).toHaveLength(0);
  });
});
