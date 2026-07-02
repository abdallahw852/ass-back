import { randomUUID } from 'node:crypto';
import { AggregateRoot } from '../../../../shared/domain/aggregate-root';
import { Email } from '../value-objects/email.value-object';
import { UserAccountEntity } from '../entities/user-account.entity';
import { UserRole } from '../enums/user-role.enum';
import { UserRegisteredEvent } from '../events/user-registered.event';
import { OtpVerifiedEvent } from '../events/otp-verified.event';
import { PasswordSetEvent } from '../events/password-set.event';
import { AuthPasswordSetupRequiredException } from '../auth.exceptions';

export class UserAggregate extends AggregateRoot {
  private userAccount!: UserAccountEntity;

  private constructor(id: string) {
    super(id);
  }

  /** Creates a new user in the unverified state with a password already hashed. */
  static register(
    email: string,
    passwordHash: string,
    role: UserRole,
  ): UserAggregate {
    const aggregate = new UserAggregate(randomUUID());
    aggregate.userAccount = UserAccountEntity.create({
      email,
      role,
      verifiedAt: null,
      passwordHash,
      requiresPasswordSetup: false,
    });
    aggregate.raiseEvent(
      UserRegisteredEvent.create({
        aggregateId: aggregate.id,
        version: aggregate.version + 1,
        email,
        hasPassword: true,
      }),
    );
    return aggregate;
  }

  /** Rehydrates a legacy account (no password) that needs a setup step. */
  static createLegacy(email: string, role: UserRole): UserAggregate {
    const aggregate = new UserAggregate(randomUUID());
    aggregate.userAccount = UserAccountEntity.create({
      email,
      role,
      verifiedAt: null,
      passwordHash: null,
      requiresPasswordSetup: true,
    });
    aggregate.raiseEvent(
      UserRegisteredEvent.create({
        aggregateId: aggregate.id,
        version: aggregate.version + 1,
        email,
        hasPassword: false,
      }),
    );
    return aggregate;
  }

  /** Kept for backwards compatibility with the OTP-only flow. */
  static create(emailVo: Email): UserAggregate {
    const aggregate = new UserAggregate(randomUUID());
    aggregate.userAccount = UserAccountEntity.create({
      email: emailVo.getValue(),
      role: UserRole.USER,
    });
    return aggregate;
  }

  verifyEmail(now: Date): void {
    if (this.isVerified()) return;
    this.userAccount.verifyEmail(now);
    this.raiseEvent(
      OtpVerifiedEvent.create({
        aggregateId: this.id,
        version: this.version + 1,
        email: this.userAccount.getEmail(),
        purpose: 'signup_verification',
      }),
    );
  }

  setInitialPassword(passwordHash: string): void {
    if (!this.userAccount.getRequiresPasswordSetup()) {
      throw new AuthPasswordSetupRequiredException();
    }
    this.userAccount.setInitialPassword(passwordHash);
    this.raiseEvent(
      PasswordSetEvent.create({
        aggregateId: this.id,
        version: this.version + 1,
        email: this.userAccount.getEmail(),
        reason: 'initial-setup',
      }),
    );
  }

  isVerified(): boolean {
    return this.userAccount.isVerified();
  }

  getEmail(): string {
    return this.userAccount.getEmail();
  }

  getRole(): string {
    return this.userAccount.getRole();
  }

  getPasswordHash(): string | null {
    return this.userAccount.getPasswordHash();
  }

  getRequiresPasswordSetup(): boolean {
    return this.userAccount.getRequiresPasswordSetup();
  }

  /** @deprecated Use isVerified() */
  getIsVerified(): boolean {
    return this.isVerified();
  }

  /** @deprecated Use verifyEmail() */
  verify(): void {
    this.verifyEmail(new Date());
  }

  getAggregateType(): string {
    return 'User';
  }
}
