import type { ISupplierRepository } from '../../../domain/repositories/supplier.repository.interface';
import { SupplierOrmEntity } from '../../../infrastructure/persistence/supplier.orm-entity';
import { UpdateBusinessInfoCommand } from '../update-business-info.command';
import { UpdateBusinessInfoHandler } from './update-business-info.handler';

class FakeSupplierRepo implements ISupplierRepository {
  private store: SupplierOrmEntity[] = [];

  seed(data: Partial<SupplierOrmEntity>): void {
    const entity = Object.assign(new SupplierOrmEntity(), {
      id: this.store.length + 1,
      _id: `sup-uuid-${this.store.length + 1}`,
      isVerified: false,
      verificationStatus: 'pending',
      ...data,
    });
    this.store.push(entity);
  }

  findByUserId(userId: number): Promise<SupplierOrmEntity | null> {
    return Promise.resolve(this.store.find((s) => s.userId === userId) ?? null);
  }
  findByRegistrationNumber(): Promise<null> {
    return Promise.resolve(null);
  }
  findByPublicId(): Promise<null> {
    return Promise.resolve(null);
  }
  save(s: Partial<SupplierOrmEntity>): Promise<SupplierOrmEntity> {
    const existing = this.store.find(
      (e) => e.id === s.id || e.userId === s.userId,
    );
    if (existing) {
      Object.assign(existing, s);
      return Promise.resolve(existing);
    }
    const entity = Object.assign(new SupplierOrmEntity(), {
      id: this.store.length + 1,
      ...s,
    });
    this.store.push(entity);
    return Promise.resolve(entity);
  }

  findManyForListing(): Promise<{ rows: SupplierOrmEntity[]; total: number }> {
    return Promise.resolve({ rows: [], total: 0 });
  }
}

describe('UpdateBusinessInfoHandler', () => {
  it('updates only provided fields without touching isVerified', async () => {
    const repo = new FakeSupplierRepo();
    repo.seed({
      userId: 1,
      companyName: 'OldCo',
      isVerified: true,
      businessDescription: null,
    });
    const handler = new UpdateBusinessInfoHandler(repo as never);

    const result = await handler.execute(
      new UpdateBusinessInfoCommand(1, {
        companyName: 'NewCo',
        businessDescription: 'A great company',
      }),
    );

    expect(result.companyName).toBe('NewCo');
    expect(result.businessDescription).toBe('A great company');
    expect(result.isVerified).toBe(true);
  });

  it('sets latitude, longitude, and yearEstablished', async () => {
    const repo = new FakeSupplierRepo();
    repo.seed({
      userId: 2,
      companyName: 'Co',
      latitude: null,
      longitude: null,
      yearEstablished: null,
    });
    const handler = new UpdateBusinessInfoHandler(repo as never);

    const result = await handler.execute(
      new UpdateBusinessInfoCommand(2, {
        latitude: 24.7136,
        longitude: 46.6753,
        yearEstablished: 2018,
      }),
    );

    expect(result.latitude).toBe(24.7136);
    expect(result.longitude).toBe(46.6753);
    expect(result.yearEstablished).toBe(2018);
  });

  it('clears logoUrl when removeLogo is true', async () => {
    const repo = new FakeSupplierRepo();
    repo.seed({
      userId: 3,
      companyName: 'Co',
      logoUrl: '/uploads/logos/old.jpg',
    });
    const handler = new UpdateBusinessInfoHandler(repo as never);

    const result = await handler.execute(
      new UpdateBusinessInfoCommand(3, { removeLogo: true }),
    );

    expect(result.logoUrl).toBeNull();
  });

  it('throws NotFoundException when supplier does not exist', async () => {
    const handler = new UpdateBusinessInfoHandler(
      new FakeSupplierRepo() as never,
    );
    await expect(
      handler.execute(new UpdateBusinessInfoCommand(99, { companyName: 'X' })),
    ).rejects.toThrow('Supplier profile not found.');
  });
});
