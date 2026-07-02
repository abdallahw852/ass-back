import { RegisterUserHandler } from './register-user.handler';
import { RegisterUserCommand } from './register-user.command';
import type { IUserRepository } from '../../domain/repositories/user.repository.interface';
import type { IOtpCodeRepository } from '../../domain/repositories/otp-code.repository.interface';
import type { IPasswordPort } from '../ports/password.port';
import { UserOrmEntity } from '../../infrastructure/persistence/user.orm-entity';
import { UserRole } from '../../domain/enums/user-role.enum';

class FakeUserRepo implements IUserRepository {
  private store: UserOrmEntity[] = [];

  findById(): Promise<UserOrmEntity | null> {
    return Promise.resolve(null);
  }
  findByEmail(email: string): Promise<UserOrmEntity | null> {
    return Promise.resolve(this.store.find((u) => u.email === email) ?? null);
  }
  findByEmailIncludingUnverified(email: string): Promise<UserOrmEntity | null> {
    return this.findByEmail(email);
  }
  findByPublicId(id: string): Promise<UserOrmEntity | null> {
    return Promise.resolve(this.store.find((u) => u._id === id) ?? null);
  }
  findByPhone(phone: string): Promise<UserOrmEntity | null> {
    return Promise.resolve(this.store.find((u) => u.phone === phone) ?? null);
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
  calls = 0;
  invalidateCalls = 0;
  createRecord(): ReturnType<IOtpCodeRepository['createRecord']> {
    this.calls++;
    return Promise.resolve({} as never);
  }
  findLatestByEmail(): Promise<null> {
    return Promise.resolve(null);
  }
  findLatestByEmailAndPurpose(): Promise<null> {
    return Promise.resolve(null);
  }
  invalidateActiveByEmailAndPurpose(): Promise<void> {
    this.invalidateCalls++;
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

class FakePasswordPort implements IPasswordPort {
  hashCalls = 0;
  dummyHashCalls = 0;
  hash(_plain: string): Promise<string> {
    this.hashCalls++;
    return Promise.resolve('$2b$12$fakehashedpassword');
  }
  compare(): Promise<boolean> {
    return Promise.resolve(true);
  }
  dummyHash(): Promise<void> {
    this.dummyHashCalls++;
    return Promise.resolve();
  }
}

class FakeEmailService {
  sent: string[] = [];
  sendOtpEmail(email: string): Promise<void> {
    this.sent.push(email);
    return Promise.resolve();
  }
}

class FakeOtpService {
  generate(): string {
    return '123456';
  }
  hash(): Promise<string> {
    return Promise.resolve('$2b$10$otphash');
  }
  compare(): Promise<boolean> {
    return Promise.resolve(false);
  }
}

class FakeConfigService {
  get(key: string): unknown {
    const map: Record<string, unknown> = {
      OTP_LENGTH: 6,
      OTP_TTL_SECONDS: 600,
      OTP_RESEND_WINDOW_SECONDS: 60,
    };
    return map[key];
  }
}

function makeHandler(
  userRepo: IUserRepository,
  otpRepo: IOtpCodeRepository,
  pwdPort: IPasswordPort,
  emailSvc = new FakeEmailService(),
  otpSvc = new FakeOtpService(),
) {
  return new RegisterUserHandler(
    userRepo as never,
    otpRepo as never,
    pwdPort as never,
    emailSvc as never,
    otpSvc as never,
    new FakeConfigService() as never,
  );
}

describe('RegisterUserHandler', () => {
  it('creates a new user row and issues an OTP for a fresh email', async () => {
    const userRepo = new FakeUserRepo();
    const otpRepo = new FakeOtpRepo();
    const pwdPort = new FakePasswordPort();
    const handler = makeHandler(userRepo, otpRepo, pwdPort);

    await handler.execute(
      new RegisterUserCommand(
        'alice@example.com',
        'Passw0rd!Secret',
        'buyer',
        'Alice Smith',
        '+15551234567',
        '/uploads/avatars/alice.jpg',
      ),
    );

    expect(pwdPort.hashCalls).toBe(1);
    expect(otpRepo.calls).toBe(1);
    const saved = await userRepo.findByEmail('alice@example.com');
    expect(saved).not.toBeNull();
    expect(saved!.role).toBe(UserRole.BUYER);
    expect(saved!.name).toBe('Alice Smith');
    expect(saved!.phone).toBe('+15551234567');
    expect(saved!.avatar).toBe('/uploads/avatars/alice.jpg');
  });

  it('creates a new user without an avatar when avatarUrl is null', async () => {
    const userRepo = new FakeUserRepo();
    const handler = makeHandler(
      userRepo,
      new FakeOtpRepo(),
      new FakePasswordPort(),
    );

    await handler.execute(
      new RegisterUserCommand(
        'noavatar@example.com',
        'Passw0rd!Secret',
        'buyer',
        'No Avatar',
        '+15550000000',
        null,
      ),
    );

    const saved = await userRepo.findByEmail('noavatar@example.com');
    expect(saved).not.toBeNull();
    expect(saved!.name).toBe('No Avatar');
    expect(saved!.phone).toBe('+15550000000');
    expect(saved!.avatar ?? null).toBeNull();
  });

  it('reuses an existing unverified row and invalidates prior OTPs', async () => {
    const userRepo = new FakeUserRepo();
    await userRepo.save({
      id: 1,
      _id: 'existing-uuid',
      email: 'bob@example.com',
      role: UserRole.BUYER,
      verifiedAt: null,
      passwordHash: '$2b$12$old',
      requiresPasswordSetup: false,
      name: 'Old Name',
      phone: '+15550000000',
      avatar: '/uploads/avatars/old.jpg',
    });
    const otpRepo = new FakeOtpRepo();
    const pwdPort = new FakePasswordPort();
    const handler = makeHandler(userRepo, otpRepo, pwdPort);

    await handler.execute(
      new RegisterUserCommand(
        'bob@example.com',
        'Passw0rd!Secret',
        'buyer',
        'New Name',
        '+15559999999',
        '/uploads/avatars/new.jpg',
      ),
    );

    expect(otpRepo.invalidateCalls).toBe(1);
    expect(otpRepo.calls).toBe(1);
    expect(pwdPort.hashCalls).toBe(1);
    const saved = await userRepo.findByEmail('bob@example.com');
    expect(saved!.name).toBe('New Name');
    expect(saved!.phone).toBe('+15559999999');
    expect(saved!.avatar).toBe('/uploads/avatars/new.jpg');
  });

  it('preserves the existing avatar on resubmit when no new avatar is provided', async () => {
    const userRepo = new FakeUserRepo();
    await userRepo.save({
      id: 1,
      _id: 'existing-uuid',
      email: 'keep-avatar@example.com',
      role: UserRole.BUYER,
      verifiedAt: null,
      passwordHash: '$2b$12$old',
      requiresPasswordSetup: false,
      name: 'Old Name',
      phone: '+15550000000',
      avatar: '/uploads/avatars/keep.jpg',
    });
    const handler = makeHandler(
      userRepo,
      new FakeOtpRepo(),
      new FakePasswordPort(),
    );

    await handler.execute(
      new RegisterUserCommand(
        'keep-avatar@example.com',
        'Passw0rd!Secret',
        'buyer',
        'New Name',
        '+15559999999',
        null,
      ),
    );

    const saved = await userRepo.findByEmail('keep-avatar@example.com');
    expect(saved!.name).toBe('New Name');
    expect(saved!.avatar).toBe('/uploads/avatars/keep.jpg');
  });

  it('throws AuthAccountTypeMismatchException when accountType does not match existing unverified role', async () => {
    const userRepo = new FakeUserRepo();
    await userRepo.save({
      id: 1,
      _id: 'uuid-1',
      email: 'carol@example.com',
      role: UserRole.SUPPLIER,
      verifiedAt: null,
      passwordHash: '$2b$12$hash',
      requiresPasswordSetup: false,
    });
    const handler = makeHandler(
      userRepo,
      new FakeOtpRepo(),
      new FakePasswordPort(),
    );

    await expect(
      handler.execute(
        new RegisterUserCommand(
          'carol@example.com',
          'Passw0rd!Secret',
          'buyer',
          'Carol',
          '+15551112222',
          null,
        ),
      ),
    ).rejects.toThrow();
  });

  it('performs dummy hash for an existing fully-onboarded email (anti-enumeration)', async () => {
    const userRepo = new FakeUserRepo();
    await userRepo.save({
      id: 1,
      _id: 'uuid-2',
      email: 'dave@example.com',
      role: UserRole.BUYER,
      verifiedAt: new Date(),
      onboardingCompletedAt: new Date(),
      passwordHash: '$2b$12$existing',
      requiresPasswordSetup: false,
    });
    const pwdPort = new FakePasswordPort();
    const handler = makeHandler(userRepo, new FakeOtpRepo(), pwdPort);

    await expect(
      handler.execute(
        new RegisterUserCommand(
          'dave@example.com',
          'Passw0rd!Secret',
          'buyer',
          'Dave',
          '+15553334444',
          null,
        ),
      ),
    ).rejects.toThrow();

    expect(pwdPort.dummyHashCalls).toBe(1);
    expect(pwdPort.hashCalls).toBe(0);
  });

  it('re-registers a verified but not-yet-onboarded account: resets verification and re-sends OTP', async () => {
    const userRepo = new FakeUserRepo();
    await userRepo.save({
      id: 1,
      _id: 'uuid-incomplete',
      email: 'erin@example.com',
      role: UserRole.SUPPLIER,
      verifiedAt: new Date(),
      onboardingCompletedAt: null,
      passwordHash: '$2b$12$old',
      requiresPasswordSetup: false,
      name: 'Old Name',
      phone: '+15550000000',
    });
    const otpRepo = new FakeOtpRepo();
    const pwdPort = new FakePasswordPort();
    const handler = makeHandler(userRepo, otpRepo, pwdPort);

    const result = await handler.execute(
      new RegisterUserCommand(
        'erin@example.com',
        'Passw0rd!Secret',
        'supplier',
        'New Name',
        '+15559999999',
        null,
      ),
    );

    expect(result).toEqual({ status: 'otp_sent' });
    expect(otpRepo.invalidateCalls).toBe(1);
    expect(otpRepo.calls).toBe(1);
    expect(pwdPort.hashCalls).toBe(1);
    const saved = await userRepo.findByEmail('erin@example.com');
    expect(saved!.verifiedAt).toBeNull();
    expect(saved!.name).toBe('New Name');
    expect(saved!.phone).toBe('+15559999999');
  });

  it('throws AuthPasswordPolicyViolationException for a password that fails policy', async () => {
    const handler = makeHandler(
      new FakeUserRepo(),
      new FakeOtpRepo(),
      new FakePasswordPort(),
    );

    await expect(
      handler.execute(
        new RegisterUserCommand(
          'x@example.com',
          'weak',
          'buyer',
          'Xavier',
          '+15555556666',
          null,
        ),
      ),
    ).rejects.toThrow();
  });
});
