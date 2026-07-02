export class RejectReturnCommand {
  constructor(
    public readonly returnId: string,
    public readonly supplierId: number,
    public readonly reviewerId: number,
    public readonly reason?: string,
  ) {}
}
