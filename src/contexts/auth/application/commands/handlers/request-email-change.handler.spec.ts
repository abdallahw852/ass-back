import type { IUserRepository } from '../../../domain/repositories/user.repository.interface';
import type { IOtpCodeRepository } from '../../../domain/repositories/otp-code.repository.interface';
import { UserOrmEntity } from '../../../infrastructure/persistence/user.orm-entity';
import { OtpCodeOrmEntity } from '../../../infrastructure/persistence/otp-code.orm-entity';
import { RequestEmailChangeCommand } from '../request-email-change.command';
import { RequestEmailChangeHandler } from './request-email-change.handler';

class FakeUserRepo implements IUserRepository {
  private store: UserOrmEntity[] = [];
  seed(data: Partial<UserOrmEntity>): void {
    this.store.push(
      Object.assign(new UserOrmEntity(), {
        id: this.store.length + 1,
        _id: `uuid-${this.store.length + 1}`,
        ...data,
      }),
    );
  }
  findByEmail(email: string): Promise<UserOrmEntity | null> {
    return Promise.resolve(this.store.find((u) => u.email === email) ?? null);
  }
  findById(): Promise<null> {
    return Promise.resolve(null);
  }
  findByEmailIncludingUnverified(): Promise<null> {
    return Promise.resolve(null);
  }
  findByPublicId(): Promise<null> {
    return Promise.resolve(null);
  }
  findByPhone(): Promise<null> {
    return Promise.resolve(null);
  }
  save(): Promise<UserOrmEntity> {
    return Promise.resolve(new UserOrmEntity());
  }
  updateVerification(): Promise<void> {
    return Promise.resolve();
  }
  updatePassword(): Promise<void> {
    return Promise.resolve();
  }
  markRequiresPasswordSetup(): Promise<void> {
    return Promise.resolve();
  }
}

class FakeOtpRepo implements IOtpCodeRepository {
  created: Partial<OtpCodeOrmEntity>[] = [];
  invalidatedByUserId: { userId: number; purpose: string }[] = [];

  createRecord(
    params: Parameters<IOtpCodeRepository['createRecord']>[0],
  ): Promise<OtpCodeOrmEntity> {
    this.created.push(params as unknown as OtpCodeOrmEntity);
    return Promise.resolve({} as OtpCodeOrmEntity);
  }
  findLatestByEmail(): Promise<null> {
    return Promise.resolve(null);
  }
  findLatestByEmailAndPurpose(): Promise<null> {
    return Promise.resolve(null);
  }
  findLatestByUserIdAndPurpose(): Promise<null> {
    return Promise.resolve(null);
  }
  invalidateActiveByEmailAndPurpose(): Promise<void> {
    return Promise.resolve();
  }
  invalidateActiveByUserIdAndPurpose(
    userId: number,
    purpose: string,
  ): Promise<void> {
    this.invalidatedByUserId.push({ userId, purpose });
    return Promise.resolve();
  }
  consumeById(): Promise<boolean> {
    return Promise.resolve(true);
  }
  incrementAttempts(): Promise<void> {
    return Promise.resolve();
  }
  markConsumed(): Promise<void> {
    return Promise.resolve();
  }
}

class FakeOtpService {
  generate(): string {
    return '123456';
  }
  hash(): Promise<string> {
    return Promise.resolve('$2b$10$hash');
  }
  compare(): Promise<boolean> {
    return Promise.resolve(false);
  }
}

class FakeEmailService {
  sent: string[] = [];
  sendOtpEmail(email: string): Promise<void> {
    this.sent.push(email);
    return Promise.resolve();
  }
}

class FakeConfigService {
  get(key: string): unknown {
    return key === 'OTP_LENGTH' ? 6 : 600;
  }
}

function makeHandler(userRepo: IUserRepository, otpRepo: IOtpCodeRepository) {
  return new RequestEmailChangeHandler(
    userRepo as never,
    otpRepo as never,
    new FakeOtpService() as never,
    new FakeEmailService() as never,
    new FakeConfigService() as never,
  );
}

describe('RequestEmailChangeHandler', () => {
  it('persists OTP and sends email to the new address', async () => {
    const userRepo = new FakeUserRepo();
    const otpRepo = new FakeOtpRepo();
    const emailSvc = new FakeEmailService();
    const handler = new RequestEmailChangeHandler(
      userRepo as never,
      otpRepo as never,
      new FakeOtpService() as never,
      emailSvc as never,
      new FakeConfigService() as never,
    );

    const result = await handler.execute(
      new RequestEmailChangeCommand(1, 'uuid-1', 'new@email.com'),
    );

    expect(result.success).toBe(true);
    expect(otpRepo.created).toHaveLength(1);
    expect(otpRepo.created[0].email).toBe('new@email.com');
    expect(otpRepo.created[0].purpose).toBe('email_change');
    expect(emailSvc.sent).toContain('new@email.com');
  });

  it('invalidates previous email_change OTPs for the user', async () => {
    const otpRepo = new FakeOtpRepo();
    const handler = makeHandler(new FakeUserRepo(), otpRepo);

    await handler.execute(
      new RequestEmailChangeCommand(5, 'uuid-5', 'other@email.com'),
    );

    expect(otpRepo.invalidatedByUserId).toContainEqual({
      userId: 5,
      purpose: 'email_change',
    });
  });

  it('throws AuthEmailAlreadyInUseException when new email is already registered', async () => {
    const userRepo = new FakeUserRepo();
    userRepo.seed({ email: 'taken@email.com' });
    const handler = makeHandler(userRepo, new FakeOtpRepo());

    await expect(
      handler.execute(
        new RequestEmailChangeCommand(1, 'uuid-1', 'taken@email.com'),
      ),
    ).rejects.toThrow();
  });
});
