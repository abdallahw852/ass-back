export class ListAdminUsersQuery {
  constructor(
    public readonly role: string | undefined,
    public readonly status: string | undefined,
    public readonly verified: boolean | undefined,
    public readonly search: string | undefined,
    public readonly page: number,
    public readonly limit: number,
  ) {}
}
