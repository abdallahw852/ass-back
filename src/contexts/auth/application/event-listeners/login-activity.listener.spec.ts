import type { ILoginActivityRepository } from '../../domain/repositories/login-activity.repository.interface';
import {
  LoginActivityOrmEntity,
  LoginActivityStatus,
} from '../../infrastructure/persistence/login-activity.orm-entity';
import { LoginSucceededEvent } from '../../domain/events/login-succeeded.event';
import { LoginFailedEvent } from '../../domain/events/login-failed.event';
import { LoginActivityListener } from './login-activity.listener';

class FakeLoginActivityRepo implements ILoginActivityRepository {
  calls: Parameters<ILoginActivityRepository['create']>[0][] = [];

  create(
    params: Parameters<ILoginActivityRepository['create']>[0],
  ): Promise<LoginActivityOrmEntity> {
    this.calls.push(params);
    return Promise.resolve({
      ...params,
      id: 1,
      _id: 'uuid-1',
      status:
        params.status === 'success'
          ? LoginActivityStatus.SUCCESS
          : LoginActivityStatus.FAILED,
      createdAt: new Date(),
    } as LoginActivityOrmEntity);
  }

  findByUserId(): Promise<{ items: LoginActivityOrmEntity[]; total: number }> {
    return Promise.resolve({ items: [], total: 0 });
  }
}

describe('LoginActivityListener', () => {
  it('persists a success row for LoginSucceededEvent', async () => {
    const repo = new FakeLoginActivityRepo();
    const listener = new LoginActivityListener(repo as never);

    await listener.handle(
      LoginSucceededEvent.create({
        aggregateId: 'user-1',
        version: 0,
        userId: 42,
        email: 'a@b.com',
        ip: '127.0.0.1',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0',
      }),
    );

    expect(repo.calls).toHaveLength(1);
    expect(repo.calls[0].status).toBe('success');
    expect(repo.calls[0].userId).toBe(42);
    expect(repo.calls[0].device).toContain('Chrome');
    expect(repo.calls[0].device).toContain('Windows');
  });

  it('persists a failed row for LoginFailedEvent', async () => {
    const repo = new FakeLoginActivityRepo();
    const listener = new LoginActivityListener(repo as never);

    await listener.handle(
      LoginFailedEvent.create({
        aggregateId: 'user-2',
        version: 0,
        userId: 7,
        email: 'x@y.com',
        ip: '10.0.0.1',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Safari/604.1',
        reason: 'invalid_credentials',
      }),
    );

    expect(repo.calls[0].status).toBe('failed');
    expect(repo.calls[0].failureReason).toBe('invalid_credentials');
    expect(repo.calls[0].device).toContain('Safari');
    expect(repo.calls[0].device).toContain('iOS');
  });

  it('skips recording when userId is null', async () => {
    const repo = new FakeLoginActivityRepo();
    const listener = new LoginActivityListener(repo as never);

    await listener.handle(
      LoginFailedEvent.create({
        aggregateId: 'anonymous',
        version: 0,
        userId: null,
        email: 'none@x.com',
        ip: '1.2.3.4',
        userAgent: '',
        reason: 'invalid_credentials',
      }),
    );

    expect(repo.calls).toHaveLength(0);
  });

  it('stores null location for private/loopback IPs', async () => {
    const repo = new FakeLoginActivityRepo();
    const listener = new LoginActivityListener(repo as never);

    await listener.handle(
      LoginSucceededEvent.create({
        aggregateId: 'user-3',
        version: 0,
        userId: 1,
        email: 'a@b.com',
        ip: '127.0.0.1',
        userAgent: '',
      }),
    );

    expect(repo.calls[0].location).toBeNull();
  });
});
