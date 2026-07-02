export class UploadRfqAttachmentsCommand {
  constructor(
    public readonly rfqPublicId: string,
    public readonly buyerId: number,
    public readonly attachments: Array<{
      buffer: Buffer;
      originalName: string;
      mimeType: string;
    }>,
  ) {}
}
