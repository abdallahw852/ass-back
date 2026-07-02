export class RfqFormatter {
  static customization(
    customization: Record<string, unknown>,
  ): Record<string, unknown> {
    return {
      id: customization.id as number,
      name: customization.name as string,
      value: customization.value as string,
    };
  }

  static attachment(
    attachment: Record<string, unknown>,
  ): Record<string, unknown> {
    return {
      id: attachment.id as number,
      url: attachment.url as string,
      originalName: attachment.originalName as string,
      mimeType: attachment.mimeType as string,
      size: attachment.size as number,
    };
  }

  static quotation(
    quotation: Record<string, unknown>,
  ): Record<string, unknown> {
    return {
      id: (quotation._id ?? quotation.id) as string,
      supplierId: ((quotation.supplier as Record<string, unknown> | undefined)
        ?._id ?? quotation.supplierId) as string | number | null,
      supplierName:
        ((quotation.supplier as Record<string, unknown> | undefined)
          ?.companyName as string | undefined) ?? null,
      status: quotation.status as string,
      productName: quotation.productName as string,
      quantity: Number(quotation.quantity ?? 0),
      weightKg:
        quotation.weightKg === null || quotation.weightKg === undefined
          ? null
          : Number(quotation.weightKg),
      lengthCm:
        quotation.lengthCm === null || quotation.lengthCm === undefined
          ? null
          : Number(quotation.lengthCm),
      widthCm:
        quotation.widthCm === null || quotation.widthCm === undefined
          ? null
          : Number(quotation.widthCm),
      heightCm:
        quotation.heightCm === null || quotation.heightCm === undefined
          ? null
          : Number(quotation.heightCm),
      unitPrice: Number(quotation.unitPrice ?? 0),
      totalPrice: Number(quotation.totalPrice ?? 0),
      currency: (quotation.currency ?? 'SAR') as string,
      deliveryTimeDays: quotation.deliveryTimeDays as string,
      paymentTerms: quotation.paymentTerms as string,
      validUntil: quotation.validUntil as Date,
      shippingDetails: (quotation.shippingDetails ?? null) as string | null,
      additionalNotes: (quotation.additionalNotes ?? null) as string | null,
      buyerViewedAt: (quotation.buyerViewedAt ?? null) as Date | null,
      supplierViewedAt: (quotation.supplierViewedAt ?? null) as Date | null,
      customizations: (
        (quotation.customizations ?? []) as Record<string, unknown>[]
      ).map((customization) => RfqFormatter.customization(customization)),
      createdAt: quotation.createdAt as Date,
      updatedAt: quotation.updatedAt as Date,
    };
  }

  static rfq(rfq: Record<string, unknown>): Record<string, unknown> {
    return {
      id: (rfq._id ?? rfq.id) as string,
      referenceNumber: (rfq.referenceNumber ?? null) as string | null,
      type: rfq.type as string,
      status: rfq.status as string,
      productName: rfq.productName as string,
      quantity: Number(rfq.quantity ?? 0),
      quantityUnit: (rfq.quantityUnit ?? null) as string | null,
      message: (rfq.message ?? null) as string | null,
      technicalSpecs: (rfq.technicalSpecs ?? null) as string | null,
      sampleReadiness: (rfq.sampleReadiness ?? null) as string | null,
      requestedDeliveryDate: (rfq.requestedDeliveryDate ?? null) as
        | string
        | null,
      buyerViewedAt: (rfq.buyerViewedAt ?? null) as Date | null,
      supplierViewedAt: (rfq.supplierViewedAt ?? null) as Date | null,
      targetSupplier:
        rfq.targetSupplier && typeof rfq.targetSupplier === 'object'
          ? {
              id: ((rfq.targetSupplier as Record<string, unknown>)._id ??
                (rfq.targetSupplier as Record<string, unknown>).id) as
                | string
                | number,
              companyName: (rfq.targetSupplier as Record<string, unknown>)
                .companyName as string,
              country: ((rfq.targetSupplier as Record<string, unknown>)
                .country ?? null) as string | null,
            }
          : null,
      customizations: (
        (rfq.customizations ?? []) as Record<string, unknown>[]
      ).map((customization) => RfqFormatter.customization(customization)),
      attachments: ((rfq.attachments ?? []) as Record<string, unknown>[]).map(
        (attachment) => RfqFormatter.attachment(attachment),
      ),
      quotations: ((rfq.quotations ?? []) as Record<string, unknown>[]).map(
        (quotation) => RfqFormatter.quotation(quotation),
      ),
      createdAt: rfq.createdAt as Date,
      updatedAt: rfq.updatedAt as Date,
    };
  }

  static order(order: Record<string, unknown>): Record<string, unknown> {
    return {
      id: (order._id ?? order.id) as string,
      referenceNumber: (order.referenceNumber ?? null) as string | null,
      buyerId: order.buyerId as number,
      supplierId: order.supplierId as number,
      rfqId: order.rfqId as string,
      quotationId: order.quotationId as string,
      productName: order.productName as string,
      currency: order.currency as string,
      subtotal: Number(order.subtotal ?? 0),
      status: order.status as string,
      items: (order.items ?? []) as Record<string, unknown>[],
      snapshot: (order.snapshot ?? {}) as Record<string, unknown>,
      createdAt: order.createdAt as Date,
      updatedAt: order.updatedAt as Date,
    };
  }
}
