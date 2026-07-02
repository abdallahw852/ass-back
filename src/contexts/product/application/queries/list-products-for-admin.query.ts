export class ListProductsForAdminQuery {
  constructor(
    public readonly options?: {
      status?: string;
      page?: number;
      limit?: number;
    },
  ) {}
}
