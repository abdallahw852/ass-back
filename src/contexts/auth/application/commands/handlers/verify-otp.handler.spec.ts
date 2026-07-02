import type { IOtpCodeRepository } from '../../../domain/repositories/otp-code.repository.interface';
import type { IUserRepository } from '../../../domain/repositories/user.repository.interface';
import { OtpCodeOrmEntity } from '../../../infrastructure/persistence/otp-code.orm-entity';
import { UserOrmEntity } from '../../../infrastructure/persistence/user.orm-entity';
import { UserRole } from '../../../domain/enums/user-role.enum';
import { VerifyOtpCommand } from '../verify-otp.command';
import { VerifyOtpHandler } from './verify-otp.handler';

class FakeUserRepo implements IUserRepository {
  private store: UserOrmEntity[] = [];

  findById(): Promise<UserOrmEntity | null> {
    return Promise.resolve(null);
  }
  findByEmail(email: string): Promise<UserOrmEntity | null> {
    return Promise.resolve(this.store.find((u) => u.email === email) ?? null);
  }
  findByEmailIncludingUnverified(email: string): Promise<UserOrmEntity | null> {
    return Promise.resolve(this.store.find((u) => u.email === email) ?? null);
  }
  findByPublicId(id: string): Promise<UserOrmEntity | null> {
    return Promise.resolve(this.store.find((u) => u._id === id) ?? null);
  }
  save(user: Partial<UserOrmEntity>): Promise<UserOrmEntity> {
    const existing = this.store.find(
      (u) => u.id === user.id || u.email === user.email,
    );
    if (existing) {
      Object.assign(existing, user);
      return Promise.resolve(existing);
    }
    const entity = Object.assign(new UserOrmEntity(), {
      id: this.store.length + 1,
      _id: user._id ?? `uuid-${this.store.length + 1}`,
      ...user,
    });
    this.store.push(entity);
    return Promise.resolve(entity);
  }
  updateVerification(id: number, verifiedAt: Date): Promise<void> {
    const u = this.store.find((x) => x.id === id);
    if (u) u.verifiedAt = verifiedAt;
    return Promise.resolve();
  }
  markOnboardingCompleted(id: number, completedAt: Date): Promise<void> {
    const u = this.store.find((x) => x.id === id);
    if (u) u.onboardingCompletedAt = completedAt;
    return Promise.resolve();
  }
  updatePassword(id: number, passwordHash: string): Promise<void> {
    const u = this.store.find((x) => x.id === id);
    if (u) u.passwordHash = passwordHash;
    return Promise.resolve();
  }
  markRequiresPasswordSetup(id: number, value: boolean): Promise<void> {
    const u = this.store.find((x) => x.id === id);
    if (u) u.requiresPasswordSetup = value;
    return Promise.resolve();
  }
}

class FakeOtpRepo implements IOtpCodeRepository {
  private store: OtpCodeOrmEntity[] = [];
  private consumedIds = new Set<number>();
  incrementCalls = 0;

  seed(record: Partial<OtpCodeOrmEntity>): void {
    const entity = Object.assign(new OtpCodeOrmEntity(), {
      id: this.store.length + 1,
      attempts: 0,
      consumedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      purpose: 'signup_verification',
      userId: null,
      ...record,
    });
    this.store.push(entity);
  }

  createRecord(): ReturnType<IOtpCodeRepository['createRecord']> {
    return Promise.resolve({} as never);
  }
  findLatestByEmail(email: string): Promise<OtpCodeOrmEntity | null> {
    return Promise.resolve(
      this.store.filter((r) => r.email === email).at(-1) ?? null,
    );
  }
  findLatestByEmailAndPurpose(
    email: string,
    purpose: string,
  ): Promise<OtpCodeOrmEntity | null> {
    return Promise.resolve(
      this.store
        .filter((r) => r.email === email && r.purpose === purpose)
        .at(-1) ?? null,
    );
  }
  invalidateActiveByEmailAndPurpose(): Promise<void> {
    return Promise.resolve();
  }
  consumeById(id: number): Promise<boolean> {
    const record = this.store.find((r) => r.id === id && !r.consumedAt);
    if (!record) return Promise.resolve(false);
    if (this.consumedIds.has(id)) return Promise.resolve(false);
    this.consumedIds.add(id);
    record.consumedAt = new Date();
    return Promise.resolve(true);
  }
  incrementAttempts(id: number, attempts: number): Promise<void> {
    this.incrementCalls++;
    const record = this.store.find((r) => r.id === id);
    if (record) record.attempts = attempts;
    return Promise.resolve();
  }
  markConsumed(id: number): Promise<void> {
    const record = this.store.find((r) => r.id === id);
    if (record) record.consumedAt = new Date();
    return Promise.resolve();
  }
}

class FakeOtpService {
  private validCode = '123456';
  generate(): string {
    return this.validCode;
  }
  hash(): Promise<string> {
    return Promise.resolve('$2b$10$otphash');
  }
  compare(plain: string): Promise<boolean> {
    return Promise.resolve(plain === this.validCode);
  }
}

class FakeConfigService {
  get(key: string): unknown {
    const map: Record<string, unknown> = {
      OTP_MAX_ATTEMPTS: 5,
    };
    return map[key];
  }
}

class FakeJwtService {
  sign(_payload: unknown, _options?: unknown): string {
    return 'fake-setup-token';
  }
  verify(_token: string): { sub: string } {
    return { sub: 'uuid-1' };
  }
}

class FakeRedisService {
  set(): Promise<void> {
    return Promise.resolve();
  }
  get(): Promise<null> {
    return Promise.resolve(null);
  }
  delete(): Promise<number> {
    return Promise.resolve(1);
  }
}

function makeHandler(userRepo: IUserRepository, otpRepo: IOtpCodeRepository) {
  return new VerifyOtpHandler(
    otpRepo as never,
    userRepo as never,
    new FakeOtpService() as never,
    new FakeConfigService() as never,
    new FakeJwtService() as never,
    new FakeRedisService() as never,
  );
}

describe('VerifyOtpHandler (updated — password-otp flow)', () => {
  it('success: atomically consumes OTP and sets verifiedAt on the user', async () => {
    const userRepo = new FakeUserRepo();
    await userRepo.save({
      id: 1,
      _id: 'uuid-1',
      email: 'alice@example.com',
      role: UserRole.BUYER,
      verifiedAt: null,
      passwordHash: '$2b$12$hash',
      requiresPasswordSetup: false,
    });
    const otpRepo = new FakeOtpRepo();
    otpRepo.seed({
      email: 'alice@example.com',
      codeHash: '$2b$10$otphash',
      expiresAt: new Date(Date.now() + 300_000),
      purpose: 'signup_verification',
    });
    const session: Record<string, unknown> = {};
    const handler = makeHandler(userRepo, otpRepo);

    const result = await handler.execute(
      new VerifyOtpCommand('alice@example.com', '123456', session),
    );

    expect((result as { status: string }).status).toBe('verified');
    const saved = await userRepo.findByEmail('alice@example.com');
    expect(saved!.verifiedAt).not.toBeNull();
    expect((session as { user?: { email?: string } }).user?.email).toBe(
      'alice@example.com',
    );
  });

  it('throws AuthOtpInvalidOrExpiredException when no OTP record exists', async () => {
    const userRepo = new FakeUserRepo();
    await userRepo.save({
      id: 1,
      _id: 'uuid-1',
      email: 'bob@example.com',
      role: UserRole.BUYER,
      verifiedAt: null,
      passwordHash: '$2b$12$hash',
      requiresPasswordSetup: false,
    });
    const handler = makeHandler(userRepo, new FakeOtpRepo());

    await expect(
      handler.execute(new VerifyOtpCommand('bob@example.com', '123456', {})),
    ).rejects.toThrow();
  });

  it('throws when OTP is already consumed', async () => {
    const userRepo = new FakeUserRepo();
    await userRepo.save({
      id: 1,
      _id: 'uuid-1',
      email: 'carol@example.com',
      role: UserRole.BUYER,
      verifiedAt: null,
      passwordHash: '$2b$12$hash',
      requiresPasswordSetup: false,
    });
    const otpRepo = new FakeOtpRepo();
    otpRepo.seed({
      email: 'carol@example.com',
      codeHash: '$2b$10$otphash',
      expiresAt: new Date(Date.now() + 300_000),
      consumedAt: new Date(),
      purpose: 'signup_verification',
    });
    const handler = makeHandler(userRepo, otpRepo);

    await expect(
      handler.execute(new VerifyOtpCommand('carol@example.com', '123456', {})),
    ).rejects.toThrow();
  });

  it('throws when OTP is expired', async () => {
    const userRepo = new FakeUserRepo();
    await userRepo.save({
      id: 1,
      _id: 'uuid-1',
      email: 'dave@example.com',
      role: UserRole.BUYER,
      verifiedAt: null,
      passwordHash: '$2b$12$hash',
      requiresPasswordSetup: false,
    });
    const otpRepo = new FakeOtpRepo();
    otpRepo.seed({
      email: 'dave@example.com',
      codeHash: '$2b$10$otphash',
      expiresAt: new Date(Date.now() - 1_000),
      purpose: 'signup_verification',
    });
    const handler = makeHandler(userRepo, otpRepo);

    await expect(
      handler.execute(new VerifyOtpCommand('dave@example.com', '123456', {})),
    ).rejects.toThrow();
  });

  it('throws AuthOtpLockedException when max attempts are reached', async () => {
    const userRepo = new FakeUserRepo();
    await userRepo.save({
      id: 1,
      _id: 'uuid-1',
      email: 'eve@example.com',
      role: UserRole.BUYER,
      verifiedAt: null,
      passwordHash: '$2b$12$hash',
      requiresPasswordSetup: false,
    });
    const otpRepo = new FakeOtpRepo();
    otpRepo.seed({
      email: 'eve@example.com',
      codeHash: '$2b$10$otphash',
      expiresAt: new Date(Date.now() + 300_000),
      attempts: 5,
      purpose: 'signup_verification',
    });
    const handler = makeHandler(userRepo, otpRepo);

    await expect(
      handler.execute(new VerifyOtpCommand('eve@example.com', '123456', {})),
    ).rejects.toThrow();
  });

  it('increments attempts without consuming on wrong code', async () => {
    const userRepo = new FakeUserRepo();
    await userRepo.save({
      id: 1,
      _id: 'uuid-1',
      email: 'frank@example.com',
      role: UserRole.BUYER,
      verifiedAt: null,
      passwordHash: '$2b$12$hash',
      requiresPasswordSetup: false,
    });
    const otpRepo = new FakeOtpRepo();
    otpRepo.seed({
      email: 'frank@example.com',
      codeHash: '$2b$10$otphash',
      expiresAt: new Date(Date.now() + 300_000),
      purpose: 'signup_verification',
    });
    const handler = makeHandler(userRepo, otpRepo);

    await expect(
      handler.execute(new VerifyOtpCommand('frank@example.com', 'wrong', {})),
    ).rejects.toThrow();

    expect(otpRepo.incrementCalls).toBe(1);
    const otp = await otpRepo.findLatestByEmail('frank@example.com');
    expect(otp!.consumedAt).toBeNull();
  });

  it('returns passwordSetupRequired=true for legacy account and skips session', async () => {
    const userRepo = new FakeUserRepo();
    await userRepo.save({
      id: 1,
      _id: 'uuid-1',
      email: 'grace@example.com',
      role: UserRole.BUYER,
      verifiedAt: null,
      passwordHash: null,
      requiresPasswordSetup: true,
    });
    const otpRepo = new FakeOtpRepo();
    otpRepo.seed({
      email: 'grace@example.com',
      codeHash: '$2b$10$otphash',
      expiresAt: new Date(Date.now() + 300_000),
      purpose: 'signup_verification',
    });
    const session: Record<string, unknown> = {};
    const handler = makeHandler(userRepo, otpRepo);

    const result = await handler.execute(
      new VerifyOtpCommand('grace@example.com', '123456', session),
    );

    expect(result.passwordSetupRequired).toBe(true);
    expect((session as { user?: unknown }).user).toBeUndefined();
  });

  it('throws when consumeById returns false (concurrent consumption race)', async () => {
    const userRepo = new FakeUserRepo();
    await userRepo.save({
      id: 1,
      _id: 'uuid-1',
      email: 'henry@example.com',
      role: UserRole.BUYER,
      verifiedAt: null,
      passwordHash: '$2b$12$hash',
      requiresPasswordSetup: false,
    });
    const otpRepo = new FakeOtpRepo();
    otpRepo.seed({
      email: 'henry@example.com',
      codeHash: '$2b$10$otphash',
      expiresAt: new Date(Date.now() + 300_000),
      purpose: 'signup_verification',
    });
    // Simulate concurrent consumption — consume it first
    await otpRepo.consumeById(1);
    const handler = makeHandler(userRepo, otpRepo);

    await expect(
      handler.execute(new VerifyOtpCommand('henry@example.com', '123456', {})),
    ).rejects.toThrow();
  });
});
