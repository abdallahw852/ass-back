export class GetBuyerOrderManagementQuery {
  constructor(
    public readonly userId: number,
    public readonly page: number = 1,
    public readonly limit: number = 10,
    public readonly status?: string,
    public readonly search?: string,
  ) {}
}
