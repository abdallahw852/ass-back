import type { IUserRepository } from '../../../domain/repositories/user.repository.interface';
import type { IOtpCodeRepository } from '../../../domain/repositories/otp-code.repository.interface';
import { UserOrmEntity } from '../../../infrastructure/persistence/user.orm-entity';
import { OtpCodeOrmEntity } from '../../../infrastructure/persistence/otp-code.orm-entity';
import { ConfirmEmailChangeCommand } from '../confirm-email-change.command';
import { ConfirmEmailChangeHandler } from './confirm-email-change.handler';

class FakeUserRepo implements IUserRepository {
  private store: UserOrmEntity[] = [];
  seed(data: Partial<UserOrmEntity>): void {
    this.store.push(
      Object.assign(new UserOrmEntity(), {
        id: this.store.length + 1,
        ...data,
      }),
    );
  }
  findByPublicId(id: string): Promise<UserOrmEntity | null> {
    return Promise.resolve(this.store.find((u) => u._id === id) ?? null);
  }
  findByPhone(): Promise<null> {
    return Promise.resolve(null);
  }
  findByEmail(): Promise<null> {
    return Promise.resolve(null);
  }
  findById(id: number): Promise<UserOrmEntity | null> {
    return Promise.resolve(this.store.find((u) => u.id === id) ?? null);
  }
  findByEmailIncludingUnverified(): Promise<null> {
    return Promise.resolve(null);
  }
  save(u: Partial<UserOrmEntity>): Promise<UserOrmEntity> {
    const existing = this.store.find((x) => x._id === u._id);
    if (existing) {
      Object.assign(existing, u);
      return Promise.resolve(existing);
    }
    const entity = Object.assign(new UserOrmEntity(), u);
    this.store.push(entity);
    return Promise.resolve(entity);
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

function makeOtpRecord(
  overrides: Partial<OtpCodeOrmEntity> = {},
): OtpCodeOrmEntity {
  return Object.assign(new OtpCodeOrmEntity(), {
    id: 1,
    email: 'new@email.com',
    codeHash: '$2b$10$hash',
    expiresAt: new Date(Date.now() + 600_000),
    consumedAt: null,
    attempts: 0,
    purpose: 'email_change',
    userId: 1,
    ...overrides,
  });
}

class FakeOtpRepo implements IOtpCodeRepository {
  private record: OtpCodeOrmEntity | null = null;
  consumed = false;

  setRecord(r: OtpCodeOrmEntity | null): void {
    this.record = r;
  }

  findLatestByUserIdAndPurpose(): Promise<OtpCodeOrmEntity | null> {
    return Promise.resolve(this.record);
  }
  findLatestByEmail(): Promise<null> {
    return Promise.resolve(null);
  }
  findLatestByEmailAndPurpose(): Promise<null> {
    return Promise.resolve(null);
  }
  invalidateActiveByEmailAndPurpose(): Promise<void> {
    return Promise.resolve();
  }
  invalidateActiveByUserIdAndPurpose(): Promise<void> {
    return Promise.resolve();
  }
  createRecord(): Promise<OtpCodeOrmEntity> {
    return Promise.resolve({} as OtpCodeOrmEntity);
  }
  consumeById(): Promise<boolean> {
    this.consumed = true;
    return Promise.resolve(true);
  }
  incrementAttempts(id: number, attempts: number): Promise<void> {
    if (this.record) this.record.attempts = attempts;
    return Promise.resolve();
  }
  markConsumed(): Promise<void> {
    return Promise.resolve();
  }
}

class FakeOtpService {
  private shouldMatch = true;
  setMatch(v: boolean): void {
    this.shouldMatch = v;
  }
  generate(): string {
    return '123456';
  }
  hash(): Promise<string> {
    return Promise.resolve('$2b$10$hash');
  }
  compare(_plain: string, _hash: string): Promise<boolean> {
    return Promise.resolve(this.shouldMatch);
  }
}

class FakeConfigService {
  get(key: string): unknown {
    return key === 'OTP_MAX_ATTEMPTS' ? 5 : 600;
  }
}

function makeHandler(
  userRepo: IUserRepository,
  otpRepo: IOtpCodeRepository,
  otpSvc?: FakeOtpService,
) {
  return new ConfirmEmailChangeHandler(
    userRepo as never,
    otpRepo as never,
    (otpSvc ?? new FakeOtpService()) as never,
    new FakeConfigService() as never,
  );
}

describe('ConfirmEmailChangeHandler', () => {
  it('updates users.email on valid OTP', async () => {
    const userRepo = new FakeUserRepo();
    userRepo.seed({ _id: 'user-1', email: 'old@email.com' });
    const otpRepo = new FakeOtpRepo();
    otpRepo.setRecord(makeOtpRecord({ email: 'new@email.com', userId: 1 }));

    const result = await makeHandler(userRepo, otpRepo).execute(
      new ConfirmEmailChangeCommand(1, 'user-1', '123456'),
    );

    expect(result.email).toBe('new@email.com');
    expect(otpRepo.consumed).toBe(true);
  });

  it('throws on expired OTP', async () => {
    const userRepo = new FakeUserRepo();
    userRepo.seed({ _id: 'u1', email: 'a@b.com' });
    const otpRepo = new FakeOtpRepo();
    otpRepo.setRecord(
      makeOtpRecord({ expiresAt: new Date(Date.now() - 1000) }),
    );

    await expect(
      makeHandler(userRepo, otpRepo).execute(
        new ConfirmEmailChangeCommand(1, 'u1', '123456'),
      ),
    ).rejects.toThrow();
  });

  it('throws on consumed OTP', async () => {
    const userRepo = new FakeUserRepo();
    userRepo.seed({ _id: 'u2', email: 'a@b.com' });
    const otpRepo = new FakeOtpRepo();
    otpRepo.setRecord(makeOtpRecord({ consumedAt: new Date() }));

    await expect(
      makeHandler(userRepo, otpRepo).execute(
        new ConfirmEmailChangeCommand(1, 'u2', '123456'),
      ),
    ).rejects.toThrow();
  });

  it('throws and increments attempts on wrong OTP code', async () => {
    const userRepo = new FakeUserRepo();
    userRepo.seed({ _id: 'u3', email: 'a@b.com' });
    const otpRepo = new FakeOtpRepo();
    const record = makeOtpRecord({ attempts: 0 });
    otpRepo.setRecord(record);
    const otpSvc = new FakeOtpService();
    otpSvc.setMatch(false);

    await expect(
      makeHandler(userRepo, otpRepo, otpSvc).execute(
        new ConfirmEmailChangeCommand(1, 'u3', 'wrong'),
      ),
    ).rejects.toThrow();

    expect(record.attempts).toBe(1);
  });

  it('throws when no pending request exists', async () => {
    const userRepo = new FakeUserRepo();
    userRepo.seed({ _id: 'u4', email: 'a@b.com' });
    const otpRepo = new FakeOtpRepo();

    await expect(
      makeHandler(userRepo, otpRepo).execute(
        new ConfirmEmailChangeCommand(1, 'u4', '123456'),
      ),
    ).rejects.toThrow();
  });
});
