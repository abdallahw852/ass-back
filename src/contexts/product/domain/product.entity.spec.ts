import { Product, CreateProductProps } from './product.entity';
import { ProductStatus } from './enums/product-status.enum';
import { InvalidProductStatusTransitionException } from './product.exceptions';

// ── Helpers ────────────────────────────────────────────────────────────────────

const baseProps: CreateProductProps = {
  supplierId: 1,
  type: 'ready',
  name: 'Test Product',
};

/** Create a product in DRAFT status. */
function makeDraft(): Product {
  return Product.create(baseProps);
}

/** Create a product in PENDING status (DRAFT → submitForApproval). */
function makePending(): Product {
  const p = makeDraft();
  p.submitForApproval();
  return p;
}

/** Create a product in ACTIVE status (DRAFT → PENDING → approve). */
function makeActive(): Product {
  const p = makePending();
  p.approve(1);
  return p;
}

/** Create a product in INACTIVE status (DRAFT → PENDING → ACTIVE → deactivate). */
function makeInactive(): Product {
  const p = makeActive();
  p.deactivate();
  return p;
}

/** Create a product in REJECTED status (DRAFT → PENDING → reject). */
function makeRejected(): Product {
  const p = makePending();
  p.reject('Not up to standard', 1);
  return p;
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('Product.create()', () => {
  it('produces DRAFT status when no status is provided', () => {
    const product = makeDraft();
    expect(product.status).toBe(ProductStatus.DRAFT);
  });

  it('produces DRAFT status even when status: "active" is passed', () => {
    const product = Product.create({ ...baseProps, status: 'active' });
    expect(product.status).toBe(ProductStatus.DRAFT);
  });

  it('produces DRAFT status even when status: "pending" is passed', () => {
    const product = Product.create({ ...baseProps, status: 'pending' });
    expect(product.status).toBe(ProductStatus.DRAFT);
  });
});

describe('Product.submitForApproval()', () => {
  it('transitions DRAFT → PENDING', () => {
    const p = makeDraft();
    p.submitForApproval();
    expect(p.status).toBe(ProductStatus.PENDING);
  });

  it('transitions REJECTED → PENDING', () => {
    const p = makeRejected();
    p.submitForApproval();
    expect(p.status).toBe(ProductStatus.PENDING);
  });

  it('throws when called from PENDING', () => {
    const p = makePending();
    expect(() => p.submitForApproval()).toThrow(
      InvalidProductStatusTransitionException,
    );
  });

  it('throws when called from ACTIVE', () => {
    const p = makeActive();
    expect(() => p.submitForApproval()).toThrow(
      InvalidProductStatusTransitionException,
    );
  });
});

describe('Product.approve()', () => {
  it('transitions PENDING → ACTIVE', () => {
    const p = makePending();
    p.approve(1);
    expect(p.status).toBe(ProductStatus.ACTIVE);
  });

  it('throws when called from DRAFT', () => {
    const p = makeDraft();
    expect(() => p.approve(1)).toThrow(InvalidProductStatusTransitionException);
  });

  it('throws when called from ACTIVE (already approved)', () => {
    const p = makeActive();
    expect(() => p.approve(1)).toThrow(InvalidProductStatusTransitionException);
  });
});

describe('Product.reject()', () => {
  it('transitions PENDING → REJECTED and stores reason', () => {
    const p = makePending();
    p.reject('Blurry images', 1);
    expect(p.status).toBe(ProductStatus.REJECTED);
    expect(p.rejectionReason).toBe('Blurry images');
  });

  it('transitions ACTIVE → REJECTED and stores reason (admin revoke)', () => {
    const p = makeActive();
    p.reject('Violation of policy', 1);
    expect(p.status).toBe(ProductStatus.REJECTED);
    expect(p.rejectionReason).toBe('Violation of policy');
  });

  it('throws when called from DRAFT', () => {
    const p = makeDraft();
    expect(() => p.reject('reason', 1)).toThrow(
      InvalidProductStatusTransitionException,
    );
  });

  it('throws when called from REJECTED (already rejected)', () => {
    const p = makeRejected();
    expect(() => p.reject('another reason', 1)).toThrow(
      InvalidProductStatusTransitionException,
    );
  });
});

describe('Product.deactivate()', () => {
  it('transitions ACTIVE → INACTIVE', () => {
    const p = makeActive();
    p.deactivate();
    expect(p.status).toBe(ProductStatus.INACTIVE);
  });

  it('throws when called from PENDING', () => {
    const p = makePending();
    expect(() => p.deactivate()).toThrow(
      InvalidProductStatusTransitionException,
    );
  });

  it('throws when called from INACTIVE', () => {
    const p = makeInactive();
    expect(() => p.deactivate()).toThrow(
      InvalidProductStatusTransitionException,
    );
  });
});

describe('Product.activate()', () => {
  it('transitions INACTIVE → ACTIVE', () => {
    const p = makeInactive();
    p.activate();
    expect(p.status).toBe(ProductStatus.ACTIVE);
  });

  it('throws when called from ACTIVE', () => {
    const p = makeActive();
    expect(() => p.activate()).toThrow(InvalidProductStatusTransitionException);
  });

  it('throws when called from DRAFT', () => {
    const p = makeDraft();
    expect(() => p.activate()).toThrow(InvalidProductStatusTransitionException);
  });
});

describe('Product.archive()', () => {
  it('transitions DRAFT → ARCHIVED', () => {
    const p = makeDraft();
    p.archive();
    expect(p.status).toBe(ProductStatus.ARCHIVED);
  });

  it('transitions PENDING → ARCHIVED', () => {
    const p = makePending();
    p.archive();
    expect(p.status).toBe(ProductStatus.ARCHIVED);
  });

  it('transitions ACTIVE → ARCHIVED', () => {
    const p = makeActive();
    p.archive();
    expect(p.status).toBe(ProductStatus.ARCHIVED);
  });

  it('throws when called from ARCHIVED', () => {
    const p = makeDraft();
    p.archive();
    expect(() => p.archive()).toThrow(InvalidProductStatusTransitionException);
  });
});

describe('Product.revertToPendingForReview()', () => {
  it('transitions ACTIVE → PENDING', () => {
    const p = makeActive();
    p.revertToPendingForReview();
    expect(p.status).toBe(ProductStatus.PENDING);
  });

  it('transitions INACTIVE → PENDING', () => {
    const p = makeInactive();
    p.revertToPendingForReview();
    expect(p.status).toBe(ProductStatus.PENDING);
  });

  it('is a no-op when called from DRAFT (stays DRAFT, no error)', () => {
    const p = makeDraft();
    expect(() => p.revertToPendingForReview()).not.toThrow();
    expect(p.status).toBe(ProductStatus.DRAFT);
  });

  it('is a no-op when called from PENDING (stays PENDING)', () => {
    const p = makePending();
    expect(() => p.revertToPendingForReview()).not.toThrow();
    expect(p.status).toBe(ProductStatus.PENDING);
  });
});

describe('Product.changeStatus() (supplier-facing)', () => {
  it('from ACTIVE: target INACTIVE → deactivates', () => {
    const p = makeActive();
    p.changeStatus(ProductStatus.INACTIVE);
    expect(p.status).toBe(ProductStatus.INACTIVE);
  });

  it('from INACTIVE: target ACTIVE → activates', () => {
    const p = makeInactive();
    p.changeStatus(ProductStatus.ACTIVE);
    expect(p.status).toBe(ProductStatus.ACTIVE);
  });

  it('from DRAFT: target ARCHIVED → archives', () => {
    const p = makeDraft();
    p.changeStatus(ProductStatus.ARCHIVED);
    expect(p.status).toBe(ProductStatus.ARCHIVED);
  });

  it('from PENDING: target ACTIVE → throws (supplier cannot self-approve)', () => {
    const p = makePending();
    expect(() => p.changeStatus(ProductStatus.ACTIVE)).toThrow(
      InvalidProductStatusTransitionException,
    );
  });

  it('from REJECTED: target ACTIVE → throws (supplier cannot self-approve)', () => {
    const p = makeRejected();
    expect(() => p.changeStatus(ProductStatus.ACTIVE)).toThrow(
      InvalidProductStatusTransitionException,
    );
  });

  it('any status: target PENDING → throws (supplier cannot set pending directly)', () => {
    const p = makeDraft();
    expect(() => p.changeStatus(ProductStatus.PENDING)).toThrow(
      InvalidProductStatusTransitionException,
    );
  });
});
