import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { ILoginActivityRepository } from '../../domain/repositories/login-activity.repository.interface';
import {
  LoginActivityOrmEntity,
  LoginActivityStatus,
} from './login-activity.orm-entity';

@Injectable()
export class LoginActivityRepository implements ILoginActivityRepository {
  constructor(
    @InjectRepository(LoginActivityOrmEntity, 'write')
    private readonly repository: Repository<LoginActivityOrmEntity>,
  ) {}

  create(params: {
    userId: number;
    ipAddress: string;
    location: string | null;
    userAgent: string;
    device: string;
    status: 'success' | 'failed';
    failureReason?: string | null;
  }): Promise<LoginActivityOrmEntity> {
    const entity = this.repository.create({
      userId: params.userId,
      ipAddress: params.ipAddress,
      location: params.location,
      userAgent: params.userAgent,
      device: params.device,
      status:
        params.status === 'success'
          ? LoginActivityStatus.SUCCESS
          : LoginActivityStatus.FAILED,
      failureReason: params.failureReason ?? null,
    });
    return this.repository.save(entity);
  }

  async findByUserId(
    userId: number,
    limit: number,
    offset: number,
  ): Promise<{ items: LoginActivityOrmEntity[]; total: number }> {
    const [items, total] = await this.repository.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
    return { items, total };
  }
}
