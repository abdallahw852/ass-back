import { UserRole } from '../enums/user-role.enum';

export class UserAccountEntity {
  private email: string;
  private role: string;
  private verifiedAt: Date | null;
  private passwordHash: string | null;
  private requiresPasswordSetup: boolean;

  private constructor(props: {
    email: string;
    role: string;
    verifiedAt: Date | null;
    passwordHash: string | null;
    requiresPasswordSetup: boolean;
  }) {
    this.email = props.email;
    this.role = props.role;
    this.verifiedAt = props.verifiedAt;
    this.passwordHash = props.passwordHash;
    this.requiresPasswordSetup = props.requiresPasswordSetup;
  }

  static create(props: {
    email: string;
    role?: string;
    verifiedAt?: Date | null;
    passwordHash?: string | null;
    requiresPasswordSetup?: boolean;
  }): UserAccountEntity {
    return new UserAccountEntity({
      email: props.email,
      role: props.role ?? UserRole.USER,
      verifiedAt: props.verifiedAt ?? null,
      passwordHash: props.passwordHash ?? null,
      requiresPasswordSetup: props.requiresPasswordSetup ?? false,
    });
  }

  verifyEmail(now: Date): void {
    if (this.verifiedAt !== null) return;
    this.verifiedAt = now;
  }

  setInitialPassword(hash: string): void {
    this.passwordHash = hash;
    this.requiresPasswordSetup = false;
  }

  getEmail(): string {
    return this.email;
  }

  getRole(): string {
    return this.role;
  }

  isVerified(): boolean {
    return this.verifiedAt !== null;
  }

  getVerifiedAt(): Date | null {
    return this.verifiedAt;
  }

  getPasswordHash(): string | null {
    return this.passwordHash;
  }

  getRequiresPasswordSetup(): boolean {
    return this.requiresPasswordSetup;
  }
}
