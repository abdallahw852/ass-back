import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { ForbiddenException } from '@nestjs/common';
import { UpdateCartItemCommand } from '../update-cart-item.command';
import { CartRepository } from '../../../infrastructure/repositories/cart.repository';
import { CartItemNotFoundException } from '../../../domain/cart.exceptions';

@CommandHandler(UpdateCartItemCommand)
export class UpdateCartItemHandler implements ICommandHandler<UpdateCartItemCommand> {
  constructor(private readonly cartRepo: CartRepository) {}

  async execute(
    command: UpdateCartItemCommand,
  ): Promise<Record<string, unknown>> {
    const item = await this.cartRepo.findItemByPublicId(command.itemId);
    if (!item) throw new CartItemNotFoundException(command.itemId);

    const cart = await this.cartRepo.findOrCreateByBuyer(command.buyerId);
    if (item.cartId !== cart.id) throw new ForbiddenException();

    const updates: {
      quantity?: number;
      targetPrice?: number | null;
      notes?: string | null;
    } = {};
    if (command.quantity !== undefined) updates.quantity = command.quantity;
    if (command.targetPrice !== undefined)
      updates.targetPrice = command.targetPrice;
    if (command.notes !== undefined) updates.notes = command.notes;

    await this.cartRepo.updateItem(item.id, updates);

    return {
      id: item._id,
      quantity: command.quantity ?? item.quantity,
      targetPrice:
        command.targetPrice !== undefined
          ? command.targetPrice
          : item.targetPrice,
      notes: command.notes !== undefined ? command.notes : item.notes,
    };
  }
}
