import type { IUserRepository } from '../../domain/repositories/user.repository.interface';
import type { IPasswordPort } from '../ports/password.port';
import { UserOrmEntity } from '../../infrastructure/persistence/user.orm-entity';
import { UserRole } from '../../domain/enums/user-role.enum';
import { SetInitialPasswordCommand } from './set-initial-password.command';
import { SetInitialPasswordHandler } from './set-initial-password.handler';

class FakeUserRepo implements IUserRepository {
  private store: UserOrmEntity[] = [];

  seed(data: Partial<UserOrmEntity>): void {
    this.store.push(
      Object.assign(new UserOrmEntity(), {
        id: this.store.length + 1,
        _id: data._id ?? `uuid-${this.store.length + 1}`,
        ...data,
      }),
    );
  }

  findById(): Promise<UserOrmEntity | null> {
    return Promise.resolve(null);
  }
  findByEmail(): Promise<UserOrmEntity | null> {
    return Promise.resolve(null);
  }
  findByEmailIncludingUnverified(): Promise<UserOrmEntity | null> {
    return Promise.resolve(null);
  }
  findByPublicId(id: string): Promise<UserOrmEntity | null> {
    return Promise.resolve(this.store.find((u) => u._id === id) ?? null);
  }
  save(u: Partial<UserOrmEntity>): Promise<UserOrmEntity> {
    const existing = this.store.find((x) => x.id === u.id || x._id === u._id);
    if (existing) {
      Object.assign(existing, u);
      return Promise.resolve(existing);
    }
    const entity = Object.assign(new UserOrmEntity(), {
      id: this.store.length + 1,
      ...u,
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

class FakePasswordPort implements IPasswordPort {
  hash(_plain: string): Promise<string> {
    return Promise.resolve('$2b$12$newhash');
  }
  compare(): Promise<boolean> {
    return Promise.resolve(false);
  }
  dummyHash(): Promise<void> {
    return Promise.resolve();
  }
}

const FAKE_NONCE = 'test-nonce';

class FakeJwtService {
  private validToken = 'valid-setup-token';
  private validPublicId = 'uuid-1';

  sign(_payload: unknown): string {
    return this.validToken;
  }
  verify(token: string): { sub: string; nonce: string } {
    if (token !== this.validToken) throw new Error('invalid token');
    return { sub: this.validPublicId, nonce: FAKE_NONCE };
  }
}

class FakeRedisService {
  private store = new Map<string, string>();

  set(key: string, value: string): Promise<void> {
    this.store.set(key, value);
    return Promise.resolve();
  }
  get(key: string): Promise<string | null> {
    return Promise.resolve(this.store.get(key) ?? null);
  }
  getdel(key: string): Promise<string | null> {
    const value = this.store.get(key) ?? null;
    this.store.delete(key);
    return Promise.resolve(value);
  }
  delete(key: string): Promise<number> {
    const existed = this.store.has(key);
    this.store.delete(key);
    return Promise.resolve(existed ? 1 : 0);
  }
}

function makeHandler(
  userRepo: IUserRepository,
  pwdPort: IPasswordPort,
  redis: FakeRedisService,
  jwt: FakeJwtService,
) {
  return new SetInitialPasswordHandler(
    userRepo as never,
    pwdPort as never,
    redis as never,
    jwt as never,
  );
}

describe('SetInitialPasswordHandler', () => {
  it('stores password hash, clears requiresPasswordSetup flag, and issues a session', async () => {
    const userRepo = new FakeUserRepo();
    userRepo.seed({
      _id: 'uuid-1',
      email: 'alice@example.com',
      role: UserRole.BUYER,
      verifiedAt: new Date(),
      passwordHash: null,
      requiresPasswordSetup: true,
    });
    const redis = new FakeRedisService();
    await redis.set('pwd_setup:uuid-1', FAKE_NONCE);
    const jwt = new FakeJwtService();
    const session: Record<string, unknown> = {};

    const handler = makeHandler(userRepo, new FakePasswordPort(), redis, jwt);
    const result = await handler.execute(
      new SetInitialPasswordCommand(
        'valid-setup-token',
        'Str0ng!Passw0rd123',
        session,
      ),
    );

    expect(result.status).toBe('ok');
    const saved = await userRepo.findByPublicId('uuid-1');
    expect(saved!.passwordHash).toBe('$2b$12$newhash');
    expect(saved!.requiresPasswordSetup).toBe(false);
    expect((session as { user?: { email?: string } }).user?.email).toBe(
      'alice@example.com',
    );
  });

  it('throws for an expired/invalid token', async () => {
    const handler = makeHandler(
      new FakeUserRepo(),
      new FakePasswordPort(),
      new FakeRedisService(),
      new FakeJwtService(),
    );

    await expect(
      handler.execute(
        new SetInitialPasswordCommand('bad-token', 'Str0ng!Passw0rd123', {}),
      ),
    ).rejects.toThrow();
  });

  it('throws for a reused token (nonce already burned in Redis)', async () => {
    const userRepo = new FakeUserRepo();
    userRepo.seed({
      _id: 'uuid-1',
      email: 'bob@example.com',
      role: UserRole.BUYER,
      verifiedAt: new Date(),
      passwordHash: null,
      requiresPasswordSetup: true,
    });
    const redis = new FakeRedisService();
    // nonce NOT in Redis → already consumed
    const handler = makeHandler(
      userRepo,
      new FakePasswordPort(),
      redis,
      new FakeJwtService(),
    );

    await expect(
      handler.execute(
        new SetInitialPasswordCommand(
          'valid-setup-token',
          'Str0ng!Passw0rd123',
          {},
        ),
      ),
    ).rejects.toThrow();
  });

  it('throws AuthPasswordPolicyViolationException for a weak password', async () => {
    const userRepo = new FakeUserRepo();
    userRepo.seed({
      _id: 'uuid-1',
      email: 'carol@example.com',
      role: UserRole.BUYER,
      verifiedAt: new Date(),
      passwordHash: null,
      requiresPasswordSetup: true,
    });
    const redis = new FakeRedisService();
    await redis.set('pwd_setup:uuid-1', FAKE_NONCE);
    const handler = makeHandler(
      userRepo,
      new FakePasswordPort(),
      redis,
      new FakeJwtService(),
    );

    await expect(
      handler.execute(
        new SetInitialPasswordCommand('valid-setup-token', 'weak', {}),
      ),
    ).rejects.toThrow();
  });

  it('throws when password setup flag is already cleared', async () => {
    const userRepo = new FakeUserRepo();
    userRepo.seed({
      _id: 'uuid-1',
      email: 'dave@example.com',
      role: UserRole.BUYER,
      verifiedAt: new Date(),
      passwordHash: '$2b$12$existing',
      requiresPasswordSetup: false,
    });
    const redis = new FakeRedisService();
    await redis.set('pwd_setup:uuid-1', FAKE_NONCE);
    const handler = makeHandler(
      userRepo,
      new FakePasswordPort(),
      redis,
      new FakeJwtService(),
    );

    await expect(
      handler.execute(
        new SetInitialPasswordCommand(
          'valid-setup-token',
          'Str0ng!Passw0rd123',
          {},
        ),
      ),
    ).rejects.toThrow();
  });
});
