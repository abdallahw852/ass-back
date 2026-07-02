import type { IUserRepository } from '../../../domain/repositories/user.repository.interface';
import { UserOrmEntity } from '../../../infrastructure/persistence/user.orm-entity';
import { UpdateProfileCommand } from '../update-profile.command';
import { UpdateProfileHandler } from './update-profile.handler';

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

  findById(): Promise<null> {
    return Promise.resolve(null);
  }
  findByEmail(): Promise<null> {
    return Promise.resolve(null);
  }
  findByEmailIncludingUnverified(): Promise<null> {
    return Promise.resolve(null);
  }
  findByPublicId(id: string): Promise<UserOrmEntity | null> {
    return Promise.resolve(this.store.find((u) => u._id === id) ?? null);
  }
  findByPhone(phone: string): Promise<UserOrmEntity | null> {
    return Promise.resolve(this.store.find((u) => u.phone === phone) ?? null);
  }
  save(user: Partial<UserOrmEntity>): Promise<UserOrmEntity> {
    const existing = this.store.find((u) => u._id === user._id);
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

describe('UpdateProfileHandler', () => {
  it('updates only the provided fields and leaves others intact', async () => {
    const repo = new FakeUserRepo();
    repo.seed({ _id: 'user-1', name: 'Old Name', phone: '111', avatar: null });
    const handler = new UpdateProfileHandler(repo as never);

    const result = await handler.execute(
      new UpdateProfileCommand('user-1', { name: 'New Name' }),
    );

    expect(result.name).toBe('New Name');
    expect(result.phone).toBe('111');
  });

  it('updates phone when provided', async () => {
    const repo = new FakeUserRepo();
    repo.seed({ _id: 'user-2', name: 'Alice', phone: '000' });
    const handler = new UpdateProfileHandler(repo as never);

    const result = await handler.execute(
      new UpdateProfileCommand('user-2', { phone: '+966501234567' }),
    );

    expect(result.phone).toBe('+966501234567');
    expect(result.name).toBe('Alice');
  });

  it('updates avatar URL when provided', async () => {
    const repo = new FakeUserRepo();
    repo.seed({ _id: 'user-3', avatar: null });
    const handler = new UpdateProfileHandler(repo as never);

    const result = await handler.execute(
      new UpdateProfileCommand('user-3', {
        avatarUrl: '/uploads/avatars/img.jpg',
      }),
    );

    expect(result.avatar).toBe('/uploads/avatars/img.jpg');
  });

  it('throws NotFoundException when user does not exist', async () => {
    const handler = new UpdateProfileHandler(new FakeUserRepo() as never);
    await expect(
      handler.execute(new UpdateProfileCommand('no-such-id', { name: 'X' })),
    ).rejects.toThrow('User not found.');
  });
});
