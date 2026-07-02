export class Email {
  private constructor(private readonly value: string) {}

  static create(raw: string): Email {
    const normalized = raw.trim().toLowerCase();
    if (!normalized || !normalized.includes('@')) {
      throw new Error('Invalid email address');
    }
    return new Email(normalized);
  }

  getValue(): string {
    return this.value;
  }
}
