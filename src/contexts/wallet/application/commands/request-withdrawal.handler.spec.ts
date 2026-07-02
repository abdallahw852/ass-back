import { RequestWithdrawalCommand } from './request-withdrawal.command';
import { RequestWithdrawalHandler } from './request-withdrawal.handler';
import { SupplierWalletOrmEntity } from '../../infrastructure/persistence/supplier-wallet.orm-entity';
import { WithdrawalRequestOrmEntity } from '../../infrastructure/persistence/withdrawal-request.orm-entity';
import { InsufficientWalletBalanceException } from '../../domain/wallet.exceptions';

class FakeWalletRepo {
  private wallets: SupplierWalletOrmEntity[] = [];

  seed(data: Partial<SupplierWalletOrmEntity>): void {
    const entity = Object.assign(new SupplierWalletOrmEntity(), data);
    this.wallets.push(entity);
  }

  findOne({
    where,
  }: {
    where: { supplier_id: number };
  }): Promise<SupplierWalletOrmEntity | null> {
    return Promise.resolve(
      this.wallets.find((w) => w.supplier_id === where.supplier_id) ?? null,
    );
  }
}

class FakeWithdrawalRepo {
  private store: WithdrawalRequestOrmEntity[] = [];

  create(
    data: Partial<WithdrawalRequestOrmEntity>,
  ): WithdrawalRequestOrmEntity {
    return Object.assign(new WithdrawalRequestOrmEntity(), {
      id: this.store.length + 1,
      _id: `wd-uuid-${this.store.length + 1}`,
      currency: 'SAR',
      status: 'pending',
      created_at: new Date(),
      ...data,
    });
  }

  save(
    entity: WithdrawalRequestOrmEntity,
  ): Promise<WithdrawalRequestOrmEntity> {
    this.store.push(entity);
    return Promise.resolve(entity);
  }

  getAll(): WithdrawalRequestOrmEntity[] {
    return this.store;
  }
}

describe('RequestWithdrawalHandler', () => {
  it('creates a pending withdrawal when amount is within balance', async () => {
    const walletRepo = new FakeWalletRepo();
    walletRepo.seed({ supplier_id: 1, balance: 1000 });
    const withdrawalRepo = new FakeWithdrawalRepo();

    const handler = new RequestWithdrawalHandler(
      walletRepo as never,
      withdrawalRepo as never,
    );

    const result = await handler.execute(
      new RequestWithdrawalCommand(1, 500, 'payout-uuid-1'),
    );

    expect(result.supplier_id).toBe(1);
    expect(Number(result.amount)).toBe(500);
    expect(result.status).toBe('pending');
    expect(result.payout_method_id).toBe('payout-uuid-1');
  });

  it('creates withdrawal when amount equals balance exactly', async () => {
    const walletRepo = new FakeWalletRepo();
    walletRepo.seed({ supplier_id: 2, balance: 250 });
    const withdrawalRepo = new FakeWithdrawalRepo();

    const handler = new RequestWithdrawalHandler(
      walletRepo as never,
      withdrawalRepo as never,
    );

    await expect(
      handler.execute(new RequestWithdrawalCommand(2, 250, 'payout-uuid-2')),
    ).resolves.toBeDefined();
  });

  it('throws InsufficientWalletBalanceException when amount exceeds balance', async () => {
    const walletRepo = new FakeWalletRepo();
    walletRepo.seed({ supplier_id: 3, balance: 100 });
    const withdrawalRepo = new FakeWithdrawalRepo();

    const handler = new RequestWithdrawalHandler(
      walletRepo as never,
      withdrawalRepo as never,
    );

    await expect(
      handler.execute(new RequestWithdrawalCommand(3, 200, 'payout-uuid-3')),
    ).rejects.toThrow(InsufficientWalletBalanceException);
  });

  it('throws InsufficientWalletBalanceException when no wallet exists', async () => {
    const walletRepo = new FakeWalletRepo();
    const withdrawalRepo = new FakeWithdrawalRepo();

    const handler = new RequestWithdrawalHandler(
      walletRepo as never,
      withdrawalRepo as never,
    );

    await expect(
      handler.execute(new RequestWithdrawalCommand(99, 1, 'payout-uuid-4')),
    ).rejects.toThrow(InsufficientWalletBalanceException);
  });
});
