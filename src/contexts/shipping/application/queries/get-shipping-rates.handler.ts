import { Inject, Logger } from '@nestjs/common';
import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { GetShippingRatesQuery } from './get-shipping-rates.query';
import { CartRepository } from '../../../cart/infrastructure/repositories/cart.repository';
import type {
  IPlatformShippingPort,
  RateQuoteOption,
} from '../ports/platform-shipping.port';
import { PLATFORM_SHIPPING_PORT } from '../ports/platform-shipping.port';
import { BadRequestException, NotFoundException } from '@nestjs/common';

@QueryHandler(GetShippingRatesQuery)
export class GetShippingRatesHandler implements IQueryHandler<GetShippingRatesQuery> {
  private readonly logger = new Logger(GetShippingRatesHandler.name);

  constructor(
    private readonly cartRepo: CartRepository,
    @Inject(PLATFORM_SHIPPING_PORT)
    private readonly platformShipping: IPlatformShippingPort,
  ) {}

  async execute(query: GetShippingRatesQuery): Promise<RateQuoteOption[]> {
    const cart = await this.cartRepo.findByBuyerId(query.buyerId);
    if (!cart) {
      throw new NotFoundException('Cart not found.');
    }

    const group = (cart.supplierGroups ?? []).find(
      (g) => g.supplierId === query.supplierId,
    );
    if (!group) {
      throw new NotFoundException(
        `Supplier group for supplier '${query.supplierId}' not found in cart.`,
      );
    }

    const dest = group.shippingDestination;
    if (!dest?.torodCityId) {
      throw new BadRequestException(
        'Shipping destination with torodCityId is required to get rates.',
      );
    }

    try {
      return await this.platformShipping.getRates({
        destination: { cityId: dest.torodCityId, country: dest.country },
        weightKg: 1,
        boxCount: 1,
        totals: { amount: 0, currency: 'SAR' },
      });
    } catch (err) {
      this.logger.warn(`getRates failed, returning empty: ${String(err)}`);
      return [];
    }
  }
}
