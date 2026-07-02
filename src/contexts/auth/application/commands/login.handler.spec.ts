import type { IUserRepository } from '../../domain/repositories/user.repository.interface';
import type { IOtpCodeRepository } from '../../domain/repositories/otp-code.repository.interface';
import type { IPasswordPort } from '../ports/password.port';
import { UserOrmEntity } from '../../infrastructure/persistence/user.orm-entity';
import { UserRole } from '../../domain/enums/user-role.enum';
import { LoginCommand } from './login.command';
import { LoginHandler } from './login.handler';
import { LoginSucceededEvent } from '../../domain/events/login-succeeded.event';
import { LoginFailedEvent } from '../../domain/events/login-failed.event';

class FakeUserRepo implements IUserRepository {
  private store: UserOrmEntity[] = [];

  seed(data: Partial<UserOrmEntity>): void {
    const entity = Object.assign(new UserOrmEntity(), {
      id: this.store.length + 1,
      _id: data._id ?? `uuid-${this.store.length + 1}`,
      ...data,
    });
    this.store.push(entity);
  }

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
  findByPhone(): Promise<null> {
    return Promise.resolve(null);
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
  otpIssuedCount = 0;
  createRecord(): ReturnType<IOtpCodeRepository['createRecord']> {
    this.otpIssuedCount++;
    return Promise.resolve({} as never);
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
  invalidateActiveByUserIdAndPurpose(): Promise<void> {
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

const CORRECT_PLAIN = 'correct-password';
const CORRECT_HASH = '$2b$12$correcthash';

class FakePasswordPort implements IPasswordPort {
  dummyHashCalls = 0;
  hash(): Promise<string> {
    return Promise.resolve(CORRECT_HASH);
  }
  compare(plain: string, hash: string): Promise<boolean> {
    return Promise.resolve(plain === CORRECT_PLAIN && hash === CORRECT_HASH);
  }
  dummyHash(): Promise<void> {
    this.dummyHashCalls++;
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

class FakeEmailService {
  sendOtpEmail(): Promise<void> {
    return Promise.resolve();
  }
}

class FakeConfigService {
  get(key: string): unknown {
    const map: Record<string, unknown> = {
      OTP_TTL_SECONDS: 600,
      OTP_LENGTH: 6,
    };
    return map[key];
  }
}

class FakeEventBus {
  readonly published: unknown[] = [];
  publish(event: unknown): void {
    this.published.push(event);
  }
}

function makeHandler(
  userRepo: IUserRepository,
  otpRepo: IOtpCodeRepository,
  pwdPort: IPasswordPort,
  eventBus = new FakeEventBus(),
): { handler: LoginHandler; eventBus: FakeEventBus } {
  return {
    handler: new LoginHandler(
      userRepo as never,
      otpRepo as never,
      pwdPort as never,
      new FakeOtpService() as never,
      new FakeEmailService() as never,
      new FakeConfigService() as never,
      eventBus as never,
    ),
    eventBus,
  };
}

describe('LoginHandler', () => {
  it('issues a session for a verified user with correct password', async () => {
    const userRepo = new FakeUserRepo();
    userRepo.seed({
      email: 'alice@example.com',
      role: UserRole.BUYER,
      verifiedAt: new Date(),
      passwordHash: '$2b$12$correcthash',
      requiresPasswordSetup: false,
    });
    const session: Record<string, unknown> = {};
    const { handler, eventBus } = makeHandler(
      userRepo,
      new FakeOtpRepo(),
      new FakePasswordPort(),
    );

    const result = await handler.execute(
      new LoginCommand(
        'alice@example.com',
        'correct-password',
        '127.0.0.1',
        session,
      ),
    );

    expect(result.status).toBe('ok');
    expect((session as { user?: { email?: string } }).user?.email).toBe(
      'alice@example.com',
    );
    expect(
      (session as { user?: { verifiedAt?: unknown } }).user?.verifiedAt,
    ).toBeTruthy();
    expect(eventBus.published).toHaveLength(1);
    expect(eventBus.published[0]).toBeInstanceOf(LoginSucceededEvent);
    expect(eventBus.published[0]).toMatchObject({
      userId: 1,
      email: 'alice@example.com',
      ip: '127.0.0.1',
      userAgent: '',
    });
  });

  it('throws AuthInvalidCredentialsException for wrong password', async () => {
    const userRepo = new FakeUserRepo();
    userRepo.seed({
      email: 'bob@example.com',
      role: UserRole.BUYER,
      verifiedAt: new Date(),
      passwordHash: '$2b$12$correcthash',
      requiresPasswordSetup: false,
    });
    const { handler, eventBus } = makeHandler(
      userRepo,
      new FakeOtpRepo(),
      new FakePasswordPort(),
    );

    await expect(
      handler.execute(
        new LoginCommand('bob@example.com', 'wrongpassword', '127.0.0.1', {}),
      ),
    ).rejects.toThrow();

    expect(eventBus.published).toHaveLength(1);
    expect(eventBus.published[0]).toBeInstanceOf(LoginFailedEvent);
    expect(eventBus.published[0]).toMatchObject({
      userId: 1,
      email: 'bob@example.com',
      ip: '127.0.0.1',
      userAgent: '',
      reason: 'invalid_credentials',
    });
  });

  it('throws AuthInvalidCredentialsException for unknown email (timing-equalised via dummyHash)', async () => {
    const pwdPort = new FakePasswordPort();
    const { handler, eventBus } = makeHandler(
      new FakeUserRepo(),
      new FakeOtpRepo(),
      pwdPort,
    );

    await expect(
      handler.execute(
        new LoginCommand('nobody@example.com', 'anypassword', '127.0.0.1', {}),
      ),
    ).rejects.toThrow();

    expect(pwdPort.dummyHashCalls).toBe(1);
    expect(eventBus.published).toHaveLength(1);
    expect(eventBus.published[0]).toBeInstanceOf(LoginFailedEvent);
    expect(eventBus.published[0]).toMatchObject({
      userId: null,
      email: 'nobody@example.com',
      ip: '127.0.0.1',
      userAgent: '',
      reason: 'invalid_credentials',
    });
  });

  it('throws AuthInvalidCredentialsException when passwordHash is null', async () => {
    const userRepo = new FakeUserRepo();
    userRepo.seed({
      email: 'carol@example.com',
      role: UserRole.BUYER,
      verifiedAt: new Date(),
      passwordHash: null,
      requiresPasswordSetup: true,
    });
    const { handler, eventBus } = makeHandler(
      userRepo,
      new FakeOtpRepo(),
      new FakePasswordPort(),
    );

    await expect(
      handler.execute(
        new LoginCommand('carol@example.com', 'anypassword', '127.0.0.1', {}),
      ),
    ).rejects.toThrow();

    expect(eventBus.published).toHaveLength(1);
    expect(eventBus.published[0]).toBeInstanceOf(LoginFailedEvent);
    expect(eventBus.published[0]).toMatchObject({
      userId: null,
      email: 'carol@example.com',
      ip: '127.0.0.1',
      userAgent: '',
      reason: 'invalid_credentials',
    });
  });

  it('throws AuthPasswordSetupRequiredException for verified legacy user (requiresPasswordSetup=true) with correct password', async () => {
    const userRepo = new FakeUserRepo();
    userRepo.seed({
      email: 'dave@example.com',
      role: UserRole.BUYER,
      verifiedAt: new Date(),
      passwordHash: '$2b$12$correcthash',
      requiresPasswordSetup: true,
    });
    const { handler, eventBus } = makeHandler(
      userRepo,
      new FakeOtpRepo(),
      new FakePasswordPort(),
    );

    await expect(
      handler.execute(
        new LoginCommand(
          'dave@example.com',
          'correct-password',
          '127.0.0.1',
          {},
        ),
      ),
    ).rejects.toThrow();

    expect(eventBus.published).toHaveLength(0);
  });

  it('throws AuthUserNotVerifiedException and auto-issues OTP for unverified user with correct password', async () => {
    const userRepo = new FakeUserRepo();
    userRepo.seed({
      email: 'eve@example.com',
      role: UserRole.BUYER,
      verifiedAt: null,
      passwordHash: '$2b$12$correcthash',
      requiresPasswordSetup: false,
    });
    const otpRepo = new FakeOtpRepo();
    const { handler, eventBus } = makeHandler(
      userRepo,
      otpRepo,
      new FakePasswordPort(),
    );

    await expect(
      handler.execute(
        new LoginCommand(
          'eve@example.com',
          'correct-password',
          '127.0.0.1',
          {},
        ),
      ),
    ).rejects.toThrow();

    expect(otpRepo.otpIssuedCount).toBe(1);
    expect(eventBus.published).toHaveLength(1);
    expect(eventBus.published[0]).toBeInstanceOf(LoginFailedEvent);
    expect(eventBus.published[0]).toMatchObject({
      userId: 1,
      email: 'eve@example.com',
      ip: '127.0.0.1',
      userAgent: '',
      reason: 'unverified',
    });
  });
});
