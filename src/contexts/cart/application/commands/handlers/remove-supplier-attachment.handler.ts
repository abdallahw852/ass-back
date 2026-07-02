import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { ForbiddenException } from '@nestjs/common';
import { RemoveSupplierAttachmentCommand } from '../remove-supplier-attachment.command';
import { CartRepository } from '../../../infrastructure/repositories/cart.repository';
import { CartAttachmentNotFoundException } from '../../../domain/cart.exceptions';

@CommandHandler(RemoveSupplierAttachmentCommand)
export class RemoveSupplierAttachmentHandler implements ICommandHandler<RemoveSupplierAttachmentCommand> {
  constructor(private readonly cartRepo: CartRepository) {}

  async execute(
    command: RemoveSupplierAttachmentCommand,
  ): Promise<{ removed: boolean }> {
    const attachment = await this.cartRepo.findAttachmentByPublicId(
      command.attachmentPublicId,
    );
    if (!attachment)
      throw new CartAttachmentNotFoundException(command.attachmentPublicId);

    const cart = await this.cartRepo.findOrCreateByBuyer(command.buyerId);
    const group = await this.cartRepo.findGroupBySupplier(
      cart.id,
      command.supplierId,
    );
    if (!group || attachment.supplierGroupId !== group.id)
      throw new ForbiddenException();

    await this.cartRepo.removeAttachment(attachment.id);
    return { removed: true };
  }
}
