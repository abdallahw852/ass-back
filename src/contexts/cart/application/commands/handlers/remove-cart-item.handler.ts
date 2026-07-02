import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { ForbiddenException } from '@nestjs/common';
import { RemoveCartItemCommand } from '../remove-cart-item.command';
import { CartRepository } from '../../../infrastructure/repositories/cart.repository';
import { CartItemNotFoundException } from '../../../domain/cart.exceptions';

@CommandHandler(RemoveCartItemCommand)
export class RemoveCartItemHandler implements ICommandHandler<RemoveCartItemCommand> {
  constructor(private readonly cartRepo: CartRepository) {}

  async execute(command: RemoveCartItemCommand): Promise<{ removed: boolean }> {
    const item = await this.cartRepo.findItemByPublicId(command.itemId);
    if (!item) throw new CartItemNotFoundException(command.itemId);

    const cart = await this.cartRepo.findOrCreateByBuyer(command.buyerId);
    if (item.cartId !== cart.id) throw new ForbiddenException();

    await this.cartRepo.removeItem(item.id);
    return { removed: true };
  }
}
