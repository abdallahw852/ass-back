/**
 * Query to list products belonging to a supplier with filtering and pagination.
 */
export class ListProductsQuery {
  constructor(
    /** Internal PK of the supplier. */
    public readonly supplierId: number,
    /** Optional filters. */
    public readonly options?: {
      search?: string;
      type?: string;
      status?: string;
      categoryId?: string;
      page?: number;
      limit?: number;
    },
  ) {}
}
