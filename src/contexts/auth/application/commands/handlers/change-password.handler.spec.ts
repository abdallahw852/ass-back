import type {
  AdminUserListFilters,
  IUserRepository,
} from '../../../domain/repositories/user.repository.interface';
import type { IPasswordPort } from '../../ports/password.port';
import { UserOrmEntity } from '../../../infrastructure/persistence/user.orm-entity';
import { ChangePasswordCommand } from '../change-password.command';
import { ChangePasswordHandler } from './change-password.handler';
import {
  AuthInvalidCredentialsException,
  AuthPasswordPolicyViolationException,
  AuthUserNotFoundException,
} from '../../../domain/auth.exceptions';

const STRONG_PASSWORD = 'NewStrongP@ss123';

class FakeUserRepo implements IUserRepository {
  private store: UserOrmEntity[] = [];
  public lastUpdatedPassword: { id: number; passwordHash: string } | null =
    null;

  seed(data: Partial<UserOrmEntity>): UserOrmEntity {
    const entity = Object.assign(new UserOrmEntity(), {
      id: this.store.length + 1,
      _id: data._id ?? `uuid-${this.store.length + 1}`,
      ...data,
    });
    this.store.push(entity);
    return entity;
  }

  findById(id: number): Promise<UserOrmEntity | null> {
    return Promise.resolve(this.store.find((u) => u.id === id) ?? null);
  }
  findByEmail(): Promise<UserOrmEntity | null> {
    return Promise.resolve(null);
  }
  findByEmailIncludingUnverified(): Promise<UserOrmEntity | null> {
    return Promise.resolve(null);
  }
  findByPublicId(): Promise<UserOrmEntity | null> {
    return Promise.resolve(null);
  }
  findByPhone(): Promise<UserOrmEntity | null> {
    return Promise.resolve(null);
  }
  save(user: Partial<UserOrmEntity>): Promise<UserOrmEntity> {
    const entity = Object.assign(new UserOrmEntity(), user);
    return Promise.resolve(entity);
  }
  updateVerification(): Promise<void> {
    return Promise.resolve();
  }
  markOnboardingCompleted(): Promise<void> {
    return Promise.resolve();
  }
  updatePassword(id: number, passwordHash: string): Promise<void> {
    this.lastUpdatedPassword = { id, passwordHash };
    return Promise.resolve();
  }
  markRequiresPasswordSetup(): Promise<void> {
    return Promise.resolve();
  }
  updateStatus(): Promise<void> {
    return Promise.resolve();
  }
  findManyForAdmin(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    filters: AdminUserListFilters,
  ): Promise<{ rows: UserOrmEntity[]; total: number }> {
    return Promise.resolve({ rows: [], total: 0 });
  }
}

class FakePasswordPort implements IPasswordPort {
  hash(plain: string): Promise<string> {
    return Promise.resolve(`hashed:${plain}`);
  }
  compare(plain: string, hash: string): Promise<boolean> {
    return Promise.resolve(hash === `hashed:${plain}`);
  }
  dummyHash(): Promise<void> {
    return Promise.resolve();
  }
}

describe('ChangePasswordHandler', () => {
  it('updates the password when the current password matches', async () => {
    const repo = new FakeUserRepo();
    const passwordPort = new FakePasswordPort();
    repo.seed({ passwordHash: 'hashed:OldP@ssw0rd123' });
    const handler = new ChangePasswordHandler(
      repo as never,
      passwordPort as never,
    );

    const result = await handler.execute(
      new ChangePasswordCommand(1, 'OldP@ssw0rd123', STRONG_PASSWORD),
    );

    expect(result).toEqual({ status: 'ok' });
    expect(repo.lastUpdatedPassword).toEqual({
      id: 1,
      passwordHash: `hashed:${STRONG_PASSWORD}`,
    });
  });

  it('throws AuthInvalidCredentialsException when the current password is wrong', async () => {
    const repo = new FakeUserRepo();
    const passwordPort = new FakePasswordPort();
    repo.seed({ passwordHash: 'hashed:OldP@ssw0rd123' });
    const handler = new ChangePasswordHandler(
      repo as never,
      passwordPort as never,
    );

    await expect(
      handler.execute(
        new ChangePasswordCommand(1, 'WrongPassword', STRONG_PASSWORD),
      ),
    ).rejects.toThrow(AuthInvalidCredentialsException);
    expect(repo.lastUpdatedPassword).toBeNull();
  });

  it('throws AuthInvalidCredentialsException when the user has no password set', async () => {
    const repo = new FakeUserRepo();
    const passwordPort = new FakePasswordPort();
    repo.seed({ passwordHash: null });
    const handler = new ChangePasswordHandler(
      repo as never,
      passwordPort as never,
    );

    await expect(
      handler.execute(
        new ChangePasswordCommand(1, 'anything', STRONG_PASSWORD),
      ),
    ).rejects.toThrow(AuthInvalidCredentialsException);
  });

  it('throws AuthPasswordPolicyViolationException when the new password is weak', async () => {
    const repo = new FakeUserRepo();
    const passwordPort = new FakePasswordPort();
    repo.seed({ passwordHash: 'hashed:OldP@ssw0rd123' });
    const handler = new ChangePasswordHandler(
      repo as never,
      passwordPort as never,
    );

    await expect(
      handler.execute(new ChangePasswordCommand(1, 'OldP@ssw0rd123', 'short')),
    ).rejects.toThrow(AuthPasswordPolicyViolationException);
    expect(repo.lastUpdatedPassword).toBeNull();
  });

  it('throws AuthUserNotFoundException when the user does not exist', async () => {
    const repo = new FakeUserRepo();
    const passwordPort = new FakePasswordPort();
    const handler = new ChangePasswordHandler(
      repo as never,
      passwordPort as never,
    );

    await expect(
      handler.execute(
        new ChangePasswordCommand(99, 'anything', STRONG_PASSWORD),
      ),
    ).rejects.toThrow(AuthUserNotFoundException);
  });
});
