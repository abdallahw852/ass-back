export interface IPasswordPort {
  hash(plain: string): Promise<string>;
  compare(plain: string, hash: string): Promise<boolean>;
  /** Performs a dummy hash to equalise timing on code paths where no real hash is needed. */
  dummyHash(plain: string): Promise<void>;
}

export const PASSWORD_PORT = Symbol('PASSWORD_PORT');
