import type { SelectedShippingOption } from '../../infrastructure/persistence/cart-supplier-group.orm-entity';

export class UpdateSupplierGroupCommand {
  constructor(
    public readonly buyerId: number,
    public readonly supplierId: number,
    public readonly message?: string | null,
    public readonly shippingDestination?: {
      country: string;
      city: string;
      line1?: string;
      postalCode?: string;
      torodCityId?: number;
    } | null,
    public readonly shippingMethod?: 'platform' | 'supplier',
    public readonly selectedShippingOption?: SelectedShippingOption | null,
  ) {}
}
