import type { ISupplierRepository } from '../../../domain/repositories/supplier.repository.interface';
import type { ISupplierDocumentRepository } from '../../../domain/repositories/supplier-document.repository.interface';
import { SupplierOrmEntity } from '../../../infrastructure/persistence/supplier.orm-entity';
import { SupplierDocumentOrmEntity } from '../../../infrastructure/persistence/supplier-document.orm-entity';
import { UploadSupplierDocumentCommand } from '../upload-supplier-document.command';
import { UploadSupplierDocumentHandler } from './upload-supplier-document.handler';
import { SupplierDocumentType } from '../../../domain/enums/supplier-document-type.enum';
import { SupplierVerificationStatus } from '../../../domain/enums/supplier-verification-status.enum';

class FakeSupplierRepo implements ISupplierRepository {
  private store: SupplierOrmEntity[] = [];

  seed(data: Partial<SupplierOrmEntity>): void {
    const entity = Object.assign(new SupplierOrmEntity(), {
      id: this.store.length + 1,
      _id: `sup-uuid-${this.store.length + 1}`,
      isVerified: false,
      verificationStatus: SupplierVerificationStatus.PENDING,
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
    const existing = this.store.find((e) => e.id === s.id);
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

  getById(id: number): SupplierOrmEntity | undefined {
    return this.store.find((s) => s.id === id);
  }
}

class FakeDocumentRepo implements ISupplierDocumentRepository {
  private store: SupplierDocumentOrmEntity[] = [];

  seedDoc(data: Partial<SupplierDocumentOrmEntity>): void {
    const entity = Object.assign(new SupplierDocumentOrmEntity(), {
      id: this.store.length + 1,
      _id: `doc-uuid-${this.store.length + 1}`,
      ...data,
    });
    this.store.push(entity);
  }

  findBySupplierId(supplierId: number): Promise<SupplierDocumentOrmEntity[]> {
    return Promise.resolve(
      this.store.filter((d) => d.supplierId === supplierId),
    );
  }

  save(
    input: Partial<SupplierDocumentOrmEntity>,
  ): Promise<SupplierDocumentOrmEntity> {
    const entity = Object.assign(new SupplierDocumentOrmEntity(), {
      id: this.store.length + 1,
      _id: `doc-uuid-${this.store.length + 1}`,
      ...input,
    });
    this.store.push(entity);
    return Promise.resolve(entity);
  }
}

describe('UploadSupplierDocumentHandler', () => {
  it('does NOT approve when only one required document is uploaded', async () => {
    const supplierRepo = new FakeSupplierRepo();
    supplierRepo.seed({ userId: 1 });
    const docRepo = new FakeDocumentRepo();

    const handler = new UploadSupplierDocumentHandler(
      supplierRepo as never,
      docRepo as never,
    );

    await handler.execute(
      new UploadSupplierDocumentCommand(
        1,
        SupplierDocumentType.COMMERCIAL_REGISTRATION,
        'CR.pdf',
        'https://example.com/cr.pdf',
      ),
    );

    const supplier = supplierRepo.getById(1)!;
    expect(supplier.verificationStatus).toBe(
      SupplierVerificationStatus.PENDING,
    );
    expect(supplier.isVerified).toBe(false);
  });

  it('approves supplier when both required documents are uploaded', async () => {
    const supplierRepo = new FakeSupplierRepo();
    supplierRepo.seed({ userId: 2 });
    const docRepo = new FakeDocumentRepo();
    // pre-seed the first doc
    docRepo.seedDoc({
      supplierId: 1,
      documentType: SupplierDocumentType.COMMERCIAL_REGISTRATION,
    });

    const handler = new UploadSupplierDocumentHandler(
      supplierRepo as never,
      docRepo as never,
    );

    await handler.execute(
      new UploadSupplierDocumentCommand(
        2,
        SupplierDocumentType.TAX_CARD,
        'TaxCard.pdf',
        'https://example.com/tax.pdf',
      ),
    );

    const supplier = supplierRepo.getById(1)!;
    expect(supplier.verificationStatus).toBe(
      SupplierVerificationStatus.APPROVED,
    );
    expect(supplier.isVerified).toBe(true);
  });

  it('is idempotent — re-uploading a doc when already APPROVED does not error', async () => {
    const supplierRepo = new FakeSupplierRepo();
    supplierRepo.seed({
      userId: 3,
      verificationStatus: SupplierVerificationStatus.APPROVED,
      isVerified: true,
    });
    const docRepo = new FakeDocumentRepo();
    const supplierId = supplierRepo.getById(1)?.id ?? 1;
    docRepo.seedDoc({
      supplierId,
      documentType: SupplierDocumentType.COMMERCIAL_REGISTRATION,
    });
    docRepo.seedDoc({
      supplierId,
      documentType: SupplierDocumentType.TAX_CARD,
    });

    const handler = new UploadSupplierDocumentHandler(
      supplierRepo as never,
      docRepo as never,
    );

    await expect(
      handler.execute(
        new UploadSupplierDocumentCommand(
          3,
          SupplierDocumentType.TAX_CARD,
          'TaxCard2.pdf',
          'https://example.com/tax2.pdf',
        ),
      ),
    ).resolves.not.toThrow();

    const supplier = supplierRepo.getById(1)!;
    expect(supplier.verificationStatus).toBe(
      SupplierVerificationStatus.APPROVED,
    );
  });

  it('returns the saved document', async () => {
    const supplierRepo = new FakeSupplierRepo();
    supplierRepo.seed({ userId: 4 });
    const docRepo = new FakeDocumentRepo();

    const handler = new UploadSupplierDocumentHandler(
      supplierRepo as never,
      docRepo as never,
    );

    const result = await handler.execute(
      new UploadSupplierDocumentCommand(
        4,
        SupplierDocumentType.COMMERCIAL_REGISTRATION,
        'CR.pdf',
        'https://example.com/cr.pdf',
      ),
    );

    expect(result.documentType).toBe(
      SupplierDocumentType.COMMERCIAL_REGISTRATION,
    );
    expect(result.fileUrl).toBe('https://example.com/cr.pdf');
  });
});
