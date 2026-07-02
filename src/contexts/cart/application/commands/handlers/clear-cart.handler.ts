import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { ClearCartCommand } from '../clear-cart.command';
import { CartRepository } from '../../../infrastructure/repositories/cart.repository';

@CommandHandler(ClearCartCommand)
export class ClearCartHandler implements ICommandHandler<ClearCartCommand> {
  constructor(private readonly cartRepo: CartRepository) {}

  async execute(command: ClearCartCommand): Promise<{ cleared: boolean }> {
    const cart = await this.cartRepo.findOrCreateByBuyer(command.buyerId);
    await this.cartRepo.clearCart(cart.id);
    return { cleared: true };
  }
}
