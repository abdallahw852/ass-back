export class GetClientNotesQuery {
  constructor(
    public readonly supplierId: number,
    public readonly buyerPublicId: string,
  ) {}
}
