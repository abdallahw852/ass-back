import type { LoginActivityOrmEntity } from '../../infrastructure/persistence/login-activity.orm-entity';

export interface ILoginActivityRepository {
  create(params: {
    userId: number;
    ipAddress: string;
    location: string | null;
    userAgent: string;
    device: string;
    status: 'success' | 'failed';
    failureReason?: string | null;
  }): Promise<LoginActivityOrmEntity>;

  findByUserId(
    userId: number,
    limit: number,
    offset: number,
  ): Promise<{ items: LoginActivityOrmEntity[]; total: number }>;
}

export const LOGIN_ACTIVITY_REPOSITORY = Symbol('LOGIN_ACTIVITY_REPOSITORY');
