import { OtpCodeOrmEntity } from '../../infrastructure/persistence/otp-code.orm-entity';

export interface IOtpCodeRepository {
  createRecord(params: {
    email: string;
    codeHash: string;
    expiresAt: Date;
    purpose?: string;
    userId?: number | null;
  }): Promise<OtpCodeOrmEntity>;
  findLatestByEmail(email: string): Promise<OtpCodeOrmEntity | null>;
  findLatestByEmailAndPurpose(
    email: string,
    purpose: string,
  ): Promise<OtpCodeOrmEntity | null>;
  findLatestByUserIdAndPurpose(
    userId: number,
    purpose: string,
  ): Promise<OtpCodeOrmEntity | null>;
  invalidateActiveByEmailAndPurpose(
    email: string,
    purpose: string,
  ): Promise<void>;
  invalidateActiveByUserIdAndPurpose(
    userId: number,
    purpose: string,
  ): Promise<void>;
  /** Atomically consumes the OTP row. Returns true if consumed, false if already consumed (race-safe). */
  consumeById(id: number): Promise<boolean>;
  incrementAttempts(id: number, attempts: number): Promise<void>;
  markConsumed(id: number): Promise<void>;
}

export const OTP_CODE_REPOSITORY = Symbol('OTP_CODE_REPOSITORY');
