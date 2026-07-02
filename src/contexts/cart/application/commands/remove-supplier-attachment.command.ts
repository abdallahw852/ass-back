export class RemoveSupplierAttachmentCommand {
  constructor(
    public readonly buyerId: number,
    public readonly supplierId: number,
    public readonly attachmentPublicId: string,
  ) {}
}
