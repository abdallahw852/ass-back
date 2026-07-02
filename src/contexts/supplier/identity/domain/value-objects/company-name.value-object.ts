export class CompanyName {
  private constructor(private readonly value: string) {}

  static create(raw: string): CompanyName {
    const normalized = raw.trim();
    if (!normalized) throw new Error('Company name is required');
    return new CompanyName(normalized);
  }

  getValue(): string {
    return this.value;
  }
}
