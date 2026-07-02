import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { UploadSupplierAttachmentCommand } from '../upload-supplier-attachment.command';
import { CartRepository } from '../../../infrastructure/repositories/cart.repository';

@CommandHandler(UploadSupplierAttachmentCommand)
export class UploadSupplierAttachmentHandler implements ICommandHandler<UploadSupplierAttachmentCommand> {
  constructor(private readonly cartRepo: CartRepository) {}

  async execute(
    command: UploadSupplierAttachmentCommand,
  ): Promise<Record<string, unknown>> {
    const cart = await this.cartRepo.findOrCreateByBuyer(command.buyerId);
    const group = await this.cartRepo.upsertSupplierGroup(
      cart.id,
      command.supplierId,
      {},
    );
    const attachment = await this.cartRepo.addAttachmentToGroup(
      group.id,
      command.attachment,
    );
    return {
      id: attachment._id,
      url: attachment.url,
      originalName: attachment.originalName,
      mimeType: attachment.mimeType,
      size: attachment.size,
    };
  }
}
