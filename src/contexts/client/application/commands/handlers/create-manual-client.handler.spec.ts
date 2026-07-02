import type { IManualClientRepository } from '../../../domain/manual-client.repository.interface';
import type { ManualClient } from '../../../domain/manual-client.entity';
import { CountryCode } from '../../../domain/enums/country-code.enum';
import { ClientClassification } from '../../../domain/value-objects/client-classification.vo';
import { DuplicateClientEmailException } from '../../../domain/client.exceptions';
import { CreateManualClientCommand } from '../create-manual-client.command';
import { CreateManualClientHandler } from './create-manual-client.handler';

class FakeManualClientRepo implements IManualClientRepository {
  private _exists = false;

  seedExists(exists: boolean) {
    this._exists = exists;
  }

  existsBySupplierAndEmail(): Promise<boolean> {
    return Promise.resolve(this._exists);
  }

  save(client: ManualClient): Promise<ManualClient> {
    return Promise.resolve(client);
  }
}

const buildInput = () => ({
  companyName: 'Acme Trading',
  fullName: 'John Doe',
  email: 'john@acme.com',
  phone: '+966500000000',
  country: CountryCode.SA,
  segment: 'vip' as const,
  creditLimitSar: 50_000,
  paymentTerms: 'NET_30',
  notes: 'VIP lead from trade show',
});

describe('CreateManualClientHandler', () => {
  it('throws DuplicateClientEmailException when email already exists for supplier', async () => {
    const repo = new FakeManualClientRepo();
    repo.seedExists(true);
    const handler = new CreateManualClientHandler(repo);

    await expect(
      handler.execute(new CreateManualClientCommand(1, buildInput())),
    ).rejects.toThrow(DuplicateClientEmailException);
  });

  it('creates a manual client and returns a client read row', async () => {
    const repo = new FakeManualClientRepo();
    repo.seedExists(false);
    const handler = new CreateManualClientHandler(repo);

    const result = await handler.execute(
      new CreateManualClientCommand(1, buildInput()),
    );

    expect(result.client).toMatchObject({
      name: 'John Doe',
      email: 'john@acme.com',
      company: 'Acme Trading',
      country: CountryCode.SA,
      classification: ClientClassification.VIP,
      isManual: true,
      creditTerms: { creditLimitSar: 50_000, paymentTerms: 'NET_30' },
    });
  });
});
