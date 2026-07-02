export type RegisterSupplierInput = {
  companyName: string;
  phoneNumber: string;
  country: string;
  activityType: string;
  businessSize: string;
  registrationNumber: string;
  registrationFileUrl: string;
  notes?: string;
};

export class RegisterSupplierCommand {
  constructor(
    public readonly userId: number,
    public readonly input: RegisterSupplierInput,
  ) {}
}
