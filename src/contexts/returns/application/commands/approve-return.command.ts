export class ApproveReturnCommand {
  constructor(
    public readonly returnId: string,
    public readonly supplierId: number,
    public readonly reviewerId: number,
  ) {}
}
