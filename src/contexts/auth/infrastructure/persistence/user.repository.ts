import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  IUserRepository,
  AdminUserListFilters,
} from '../../domain/repositories/user.repository.interface';
import { UserOrmEntity } from './user.orm-entity';
import { applyTrigramSearch } from '../../../../shared/infrastructure/persistence/trigram-search';

@Injectable()
export class UserRepository implements IUserRepository {
  constructor(
    @InjectRepository(UserOrmEntity, 'write')
    private readonly repository: Repository<UserOrmEntity>,
  ) {}

  findById(id: number): Promise<UserOrmEntity | null> {
    return this.repository.findOne({ where: { id } });
  }

  findByEmail(email: string): Promise<UserOrmEntity | null> {
    return this.repository.findOne({ where: { email } });
  }

  findByEmailIncludingUnverified(email: string): Promise<UserOrmEntity | null> {
    return this.repository.findOne({ where: { email }, withDeleted: true });
  }

  findByPublicId(publicId: string): Promise<UserOrmEntity | null> {
    return this.repository.findOne({
      where: { _id: publicId },
      relations: ['supplier'],
    });
  }

  findByPhone(phone: string): Promise<UserOrmEntity | null> {
    return this.repository.findOne({ where: { phone } });
  }

  save(user: Partial<UserOrmEntity>): Promise<UserOrmEntity> {
    const entity = this.repository.create(user);
    return this.repository.save(entity);
  }

  async updateVerification(id: number, verifiedAt: Date): Promise<void> {
    await this.repository.update(id, { verifiedAt });
  }

  async markOnboardingCompleted(id: number, completedAt: Date): Promise<void> {
    await this.repository.update(id, { onboardingCompletedAt: completedAt });
  }

  async updatePassword(
    id: number,
    passwordHash: string,
    lastPasswordChangedAt: Date,
  ): Promise<void> {
    await this.repository.update(id, { passwordHash, lastPasswordChangedAt });
  }

  async markRequiresPasswordSetup(id: number, value: boolean): Promise<void> {
    await this.repository.update(id, { requiresPasswordSetup: value });
  }

  async updateStatus(
    id: number,
    status: 'active' | 'suspended',
  ): Promise<void> {
    await this.repository.update(id, { status });
  }

  async findManyForAdmin(
    filters: AdminUserListFilters,
  ): Promise<{ rows: UserOrmEntity[]; total: number }> {
    const qb = this.repository
      .createQueryBuilder('u')
      .where('u.deletedAt IS NULL');

    if (filters.role) {
      qb.andWhere('u.role = :role', { role: filters.role });
    }

    if (filters.status) {
      qb.andWhere('u.status = :status', { status: filters.status });
    }

    if (filters.verified === true) {
      qb.andWhere('u.verifiedAt IS NOT NULL');
    } else if (filters.verified === false) {
      qb.andWhere('u.verifiedAt IS NULL');
    }

    let relevanceExpr: string | null = null;
    if (filters.search) {
      relevanceExpr = applyTrigramSearch(qb, {
        term: filters.search,
        columns: [
          { expr: 'u.email', weight: 1 },
          { expr: 'u.name', weight: 1 },
        ],
      });
    }

    const offset = (filters.page - 1) * filters.limit;
    if (relevanceExpr) {
      qb.orderBy(relevanceExpr, 'DESC').addOrderBy('u.createdAt', 'DESC');
    } else {
      qb.orderBy('u.createdAt', 'DESC');
    }
    qb.skip(offset).take(filters.limit);

    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }
}
