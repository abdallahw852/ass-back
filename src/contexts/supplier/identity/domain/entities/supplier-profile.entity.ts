export class SupplierProfileEntity {
  private companyName: string;
  private isVerified: boolean;

  private constructor(props: { companyName: string; isVerified: boolean }) {
    this.companyName = props.companyName;
    this.isVerified = props.isVerified;
  }

  static create(props: {
    companyName: string;
    isVerified?: boolean;
  }): SupplierProfileEntity {
    return new SupplierProfileEntity({
      companyName: props.companyName,
      isVerified: props.isVerified ?? false,
    });
  }

  verify(): void {
    this.isVerified = true;
  }

  getCompanyName(): string {
    return this.companyName;
  }

  getIsVerified(): boolean {
    return this.isVerified;
  }
}
