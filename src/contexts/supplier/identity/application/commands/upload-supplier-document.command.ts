export class UploadSupplierDocumentCommand {
  constructor(
    public readonly userId: number,
    public readonly documentType: string,
    public readonly documentName: string,
    public readonly fileUrl: string,
  ) {}
}
