export const ENTITLEMENT_SERVICE = Symbol('ENTITLEMENT_SERVICE');

export interface IEntitlementService {
  getEntitlements(
    supplierId: number,
  ): Promise<Record<string, boolean | number>>;
  can(supplierId: number, key: string): Promise<boolean>;
  getLimit(supplierId: number, key: string): Promise<number>;
  invalidateBySupplier(supplierId: number): Promise<void>;
  invalidateAll(): Promise<void>;
}
