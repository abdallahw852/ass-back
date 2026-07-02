import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetAdminUserQuery } from '../get-admin-user.query';
import { USER_REPOSITORY } from '../../../domain/repositories/user.repository.interface';
import type { IUserRepository } from '../../../domain/repositories/user.repository.interface';
import { AuthUserNotFoundException } from '../../../domain/auth.exceptions';
import { UserOrmEntity } from '../../../infrastructure/persistence/user.orm-entity';

export interface AdminUserDetail {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  role: string;
  status: string;
  verifiedAt: Date | null;
  createdAt: Date;
  lastLoginAt: Date | null;
}

@QueryHandler(GetAdminUserQuery)
export class GetAdminUserHandler implements IQueryHandler<
  GetAdminUserQuery,
  AdminUserDetail
> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(query: GetAdminUserQuery): Promise<AdminUserDetail> {
    const user: UserOrmEntity | null = await this.userRepository.findByPublicId(
      query.userId,
    );
    if (!user) throw new AuthUserNotFoundException();

    return {
      id: user._id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      role: user.role,
      status: user.status,
      verifiedAt: user.verifiedAt,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    };
  }
}
