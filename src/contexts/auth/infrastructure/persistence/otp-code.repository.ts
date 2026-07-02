import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { IOtpCodeRepository } from '../../domain/repositories/otp-code.repository.interface';
import { OtpCodeOrmEntity } from './otp-code.orm-entity';

@Injectable()
export class OtpCodeRepository implements IOtpCodeRepository {
  constructor(
    @InjectRepository(OtpCodeOrmEntity, 'write')
    private readonly repository: Repository<OtpCodeOrmEntity>,
  ) {}

  createRecord(params: {
    email: string;
    codeHash: string;
    expiresAt: Date;
    purpose?: string;
    userId?: number | null;
  }): Promise<OtpCodeOrmEntity> {
    const entity = this.repository.create({
      email: params.email,
      codeHash: params.codeHash,
      expiresAt: params.expiresAt,
      purpose: params.purpose ?? 'signup_verification',
      userId: params.userId ?? null,
      attempts: 0,
      consumedAt: null,
    });
    return this.repository.save(entity);
  }

  findLatestByEmail(email: string): Promise<OtpCodeOrmEntity | null> {
    return this.repository.findOne({
      where: { email },
      order: { createdAt: 'DESC' },
    });
  }

  findLatestByEmailAndPurpose(
    email: string,
    purpose: string,
  ): Promise<OtpCodeOrmEntity | null> {
    return this.repository.findOne({
      where: { email, purpose, consumedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });
  }

  findLatestByUserIdAndPurpose(
    userId: number,
    purpose: string,
  ): Promise<OtpCodeOrmEntity | null> {
    return this.repository.findOne({
      where: { userId, purpose, consumedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });
  }

  async invalidateActiveByUserIdAndPurpose(
    userId: number,
    purpose: string,
  ): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .update(OtpCodeOrmEntity)
      .set({ consumedAt: new Date() })
      .where(
        '"userId" = :userId AND purpose = :purpose AND "consumedAt" IS NULL',
        { userId, purpose },
      )
      .execute();
  }

  async invalidateActiveByEmailAndPurpose(
    email: string,
    purpose: string,
  ): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .update(OtpCodeOrmEntity)
      .set({ consumedAt: new Date() })
      .where('email = :email AND purpose = :purpose AND "consumedAt" IS NULL', {
        email,
        purpose,
      })
      .execute();
  }

  async consumeById(id: number): Promise<boolean> {
    const result = await this.repository
      .createQueryBuilder()
      .update(OtpCodeOrmEntity)
      .set({ consumedAt: new Date() })
      .where('id = :id AND "consumedAt" IS NULL', { id })
      .returning('id')
      .execute();
    return (result.affected ?? 0) > 0;
  }

  async incrementAttempts(id: number, attempts: number): Promise<void> {
    await this.repository.update(id, { attempts });
  }

  async markConsumed(id: number): Promise<void> {
    await this.repository.update(id, { consumedAt: new Date() });
  }
}
