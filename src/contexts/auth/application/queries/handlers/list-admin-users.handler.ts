import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ListAdminUsersQuery } from '../list-admin-users.query';
import { USER_REPOSITORY } from '../../../domain/repositories/user.repository.interface';
import type { IUserRepository } from '../../../domain/repositories/user.repository.interface';
import { UserOrmEntity } from '../../../infrastructure/persistence/user.orm-entity';

export interface AdminUserItem {
  id: string;
  email: string;
  name: string | null;
  role: string;
  status: string;
  verifiedAt: Date | null;
  createdAt: Date;
}

export interface ListAdminUsersResult {
  items: AdminUserItem[];
  total: number;
  page: number;
  limit: number;
}

@QueryHandler(ListAdminUsersQuery)
export class ListAdminUsersHandler implements IQueryHandler<
  ListAdminUsersQuery,
  ListAdminUsersResult
> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(query: ListAdminUsersQuery): Promise<ListAdminUsersResult> {
    const { rows, total } = await this.userRepository.findManyForAdmin({
      role: query.role,
      status: query.status,
      verified: query.verified,
      search: query.search,
      page: query.page,
      limit: query.limit,
    });

    const items: AdminUserItem[] = rows.map(
      (u: UserOrmEntity): AdminUserItem => ({
        id: u._id,
        email: u.email,
        name: u.name,
        role: u.role,
        status: u.status,
        verifiedAt: u.verifiedAt,
        createdAt: u.createdAt,
      }),
    );

    return { items, total, page: query.page, limit: query.limit };
  }
}
