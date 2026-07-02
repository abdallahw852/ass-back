import { BcryptPasswordAdapter } from './bcrypt-password.adapter';

describe('BcryptPasswordAdapter', () => {
  let adapter: BcryptPasswordAdapter;

  beforeEach(() => {
    adapter = new BcryptPasswordAdapter();
  });

  describe('hash', () => {
    it('returns a string that starts with the bcrypt prefix $2b$', async () => {
      const hash = await adapter.hash('MyPassword123!');
      expect(hash).toMatch(/^\$2[ab]\$/);
    });

    it('produces a different hash each call (salted)', async () => {
      const h1 = await adapter.hash('MyPassword123!');
      const h2 = await adapter.hash('MyPassword123!');
      expect(h1).not.toBe(h2);
    });

    it('does not include the plaintext in the hash output', async () => {
      const plain = 'MyPassword123!';
      const hash = await adapter.hash(plain);
      expect(hash).not.toContain(plain);
    });
  });

  describe('compare', () => {
    it('returns true when plaintext matches the hash', async () => {
      const plain = 'MyPassword123!';
      const hash = await adapter.hash(plain);
      const result = await adapter.compare(plain, hash);
      expect(result).toBe(true);
    });

    it('returns false when plaintext does not match the hash', async () => {
      const hash = await adapter.hash('MyPassword123!');
      const result = await adapter.compare('WrongPassword99!', hash);
      expect(result).toBe(false);
    });

    it('returns false for an empty string against a real hash', async () => {
      const hash = await adapter.hash('MyPassword123!');
      const result = await adapter.compare('', hash);
      expect(result).toBe(false);
    });
  });

  describe('dummyHash', () => {
    it('resolves without throwing', async () => {
      await expect(adapter.dummyHash('anything')).resolves.not.toThrow();
    });
  });
});
