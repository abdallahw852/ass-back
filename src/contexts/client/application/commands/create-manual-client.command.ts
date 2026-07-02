import type { CountryCode } from '../../domain/enums/country-code.enum';
import type { ClientSegment } from '../../domain/value-objects/client-segment.vo';

export class CreateManualClientCommand {
  constructor(
    public readonly supplierId: number,
    public readonly input: {
      companyName: string;
      fullName: string;
      email: string;
      phone: string;
      country: CountryCode;
      segment: ClientSegment;
      creditLimitSar: number | null;
      paymentTerms: string | null;
      notes: string | null;
    },
  ) {}
}
