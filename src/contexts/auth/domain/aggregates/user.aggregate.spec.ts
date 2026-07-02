import { UserAggregate } from './user.aggregate';
import { UserRole } from '../enums/user-role.enum';

describe('UserAggregate', () => {
  const email = 'alice@example.com';
  const passwordHash = '$2b$12$hashedpassword';

  describe('register', () => {
    it('creates an aggregate in the unverified state', () => {
      const agg = UserAggregate.register(email, passwordHash, UserRole.BUYER);
      expect(agg.isVerified()).toBe(false);
    });

    it('sets the email', () => {
      const agg = UserAggregate.register(email, passwordHash, UserRole.BUYER);
      expect(agg.getEmail()).toBe(email);
    });

    it('sets the role', () => {
      const agg = UserAggregate.register(email, passwordHash, UserRole.BUYER);
      expect(agg.getRole()).toBe(UserRole.BUYER);
    });

    it('emits a UserRegisteredEvent', () => {
      const agg = UserAggregate.register(email, passwordHash, UserRole.BUYER);
      const events = agg.getDomainEvents();
      expect(
        events.some((e) => e.constructor.name === 'UserRegisteredEvent'),
      ).toBe(true);
    });
  });

  describe('verifyEmail', () => {
    it('transitions isVerified from false to true', () => {
      const agg = UserAggregate.register(email, passwordHash, UserRole.BUYER);
      agg.verifyEmail(new Date());
      expect(agg.isVerified()).toBe(true);
    });

    it('is idempotent — calling twice does not throw', () => {
      const agg = UserAggregate.register(email, passwordHash, UserRole.BUYER);
      const now = new Date();
      agg.verifyEmail(now);
      expect(() => agg.verifyEmail(new Date())).not.toThrow();
      expect(agg.isVerified()).toBe(true);
    });

    it('emits an OtpVerifiedEvent', () => {
      const agg = UserAggregate.register(email, passwordHash, UserRole.BUYER);
      agg.verifyEmail(new Date());
      const events = agg.getDomainEvents();
      expect(
        events.some((e) => e.constructor.name === 'OtpVerifiedEvent'),
      ).toBe(true);
    });
  });

  describe('setInitialPassword', () => {
    it('throws if requiresPasswordSetup is false', () => {
      const agg = UserAggregate.register(email, passwordHash, UserRole.BUYER);
      // register sets requiresPasswordSetup = false by default
      expect(() => agg.setInitialPassword('$2b$12$newhash')).toThrow();
    });

    it('succeeds and emits PasswordSetEvent when requiresPasswordSetup is true', () => {
      const agg = UserAggregate.createLegacy(email, UserRole.BUYER);
      agg.setInitialPassword('$2b$12$newhash');
      const events = agg.getDomainEvents();
      expect(
        events.some((e) => e.constructor.name === 'PasswordSetEvent'),
      ).toBe(true);
    });
  });

  describe('isVerified getter', () => {
    it('returns false when verifiedAt is null', () => {
      const agg = UserAggregate.register(email, passwordHash, UserRole.BUYER);
      expect(agg.isVerified()).toBe(false);
    });

    it('returns true when verifiedAt is set', () => {
      const agg = UserAggregate.register(email, passwordHash, UserRole.BUYER);
      agg.verifyEmail(new Date());
      expect(agg.isVerified()).toBe(true);
    });
  });

  describe('passwordHash invariant', () => {
    it('register() stores a passwordHash that can be retrieved', () => {
      const agg = UserAggregate.register(email, passwordHash, UserRole.BUYER);
      expect(agg.getPasswordHash()).toBe(passwordHash);
    });

    it('legacy aggregate has null passwordHash', () => {
      const agg = UserAggregate.createLegacy(email, UserRole.BUYER);
      expect(agg.getPasswordHash()).toBeNull();
    });
  });
});
