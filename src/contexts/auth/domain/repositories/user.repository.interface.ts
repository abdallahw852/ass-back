import { UserOrmEntity } from '../../infrastructure/persistence/user.orm-entity';

export interface AdminUserListFilters {
  role?: string;
  status?: string;
  verified?: boolean;
  search?: string;
  page: number;
  limit: number;
}

export interface IUserRepository {
  findById(id: number): Promise<UserOrmEntity | null>;
  findByEmail(email: string): Promise<UserOrmEntity | null>;
  /** Finds a user by email regardless of verification status (includes soft-deleted aware query). */
  findByEmailIncludingUnverified(email: string): Promise<UserOrmEntity | null>;
  findByPublicId(publicId: string): Promise<UserOrmEntity | null>;
  findByPhone(phone: string): Promise<UserOrmEntity | null>;
  save(user: Partial<UserOrmEntity>): Promise<UserOrmEntity>;
  updateVerification(id: number, verifiedAt: Date): Promise<void>;
  markOnboardingCompleted(id: number, completedAt: Date): Promise<void>;
  updatePassword(
    id: number,
    passwordHash: string,
    lastPasswordChangedAt: Date,
  ): Promise<void>;
  markRequiresPasswordSetup(id: number, value: boolean): Promise<void>;
  updateStatus(id: number, status: 'active' | 'suspended'): Promise<void>;
  findManyForAdmin(
    filters: AdminUserListFilters,
  ): Promise<{ rows: UserOrmEntity[]; total: number }>;
}

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
