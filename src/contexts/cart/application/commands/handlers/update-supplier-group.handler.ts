import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { UpdateSupplierGroupCommand } from '../update-supplier-group.command';
import { CartRepository } from '../../../infrastructure/repositories/cart.repository';

@CommandHandler(UpdateSupplierGroupCommand)
export class UpdateSupplierGroupHandler implements ICommandHandler<UpdateSupplierGroupCommand> {
  constructor(private readonly cartRepo: CartRepository) {}

  async execute(
    command: UpdateSupplierGroupCommand,
  ): Promise<Record<string, unknown>> {
    const cart = await this.cartRepo.findOrCreateByBuyer(command.buyerId);
    const group = await this.cartRepo.upsertSupplierGroup(
      cart.id,
      command.supplierId,
      {
        message: command.message,
        shippingDestination: command.shippingDestination,
        shippingMethod: command.shippingMethod,
        selectedShippingOption: command.selectedShippingOption,
      },
    );
    return {
      supplierId: group.supplierId,
      message: group.message,
      shippingDestination: group.shippingDestination,
      shippingMethod: group.shippingMethod,
      selectedShippingOption: group.selectedShippingOption,
    };
  }
}
