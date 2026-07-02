export class ListAdminWithdrawalsQuery {
  constructor(
    public readonly status: string | undefined,
    public readonly page: number,
    public readonly limit: number,
  ) {}
}
