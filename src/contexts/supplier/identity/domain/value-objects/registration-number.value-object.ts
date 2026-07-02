export class RegistrationNumber {
  private constructor(private readonly value: string) {}

  static create(raw: string): RegistrationNumber {
    const normalized = raw.trim();
    if (!normalized) throw new Error('Registration number is required');
    return new RegistrationNumber(normalized);
  }

  getValue(): string {
    return this.value;
  }
}
