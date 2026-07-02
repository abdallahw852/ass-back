export class UploadSupplierAttachmentCommand {
  constructor(
    public readonly buyerId: number,
    public readonly supplierId: number,
    public readonly attachment: {
      url: string;
      originalName: string;
      mimeType: string;
      size: number;
    },
  ) {}
}
