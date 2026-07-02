import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ListLoginActivityQuery } from '../list-login-activity.query';
import { LOGIN_ACTIVITY_REPOSITORY } from '../../../domain/repositories/login-activity.repository.interface';
import type { ILoginActivityRepository } from '../../../domain/repositories/login-activity.repository.interface';
import type { LoginActivityOrmEntity } from '../../../infrastructure/persistence/login-activity.orm-entity';

export type LoginActivityResult = {
  items: LoginActivityOrmEntity[];
  total: number;
};

@QueryHandler(ListLoginActivityQuery)
export class ListLoginActivityHandler implements IQueryHandler<
  ListLoginActivityQuery,
  LoginActivityResult
> {
  constructor(
    @Inject(LOGIN_ACTIVITY_REPOSITORY)
    private readonly loginActivityRepo: ILoginActivityRepository,
  ) {}

  execute(query: ListLoginActivityQuery): Promise<LoginActivityResult> {
    return this.loginActivityRepo.findByUserId(
      query.userId,
      query.limit,
      query.offset,
    );
  }
}
