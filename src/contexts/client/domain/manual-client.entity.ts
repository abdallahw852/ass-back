import { randomUUID } from 'node:crypto';
import { CountryCode } from './enums/country-code.enum';
import { ClientClassification } from './value-objects/client-classification.vo';

export interface CreateManualClientProps {
  supplierId: number;
  companyName: string;
  fullName: string;
  email: string;
  phone: string;
  country: CountryCode;
  classification: ClientClassification;
  creditLimitSar: number | null;
  paymentTerms: string | null;
  notes: string | null;
}

export interface ReconstitutedManualClientProps extends CreateManualClientProps {
  _id: string;
  internalId: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * A manually-added contact/lead, scoped to a supplier. Coexists with
 * order-derived clients (buyers who placed paid/fulfilled orders).
 */
export class ManualClient {
  private constructor(
    private readonly _id: string,
    private _internalId: number | null,
    private readonly _supplierId: number,
    private _companyName: string,
    private _fullName: string,
    private _email: string,
    private _phone: string,
    private _country: CountryCode,
    private _classification: ClientClassification,
    private _creditLimitSar: number | null,
    private _paymentTerms: string | null,
    private _notes: string | null,
    private readonly _createdAt: Date,
    private _updatedAt: Date,
  ) {}

  static create(props: CreateManualClientProps): ManualClient {
    return new ManualClient(
      randomUUID(),
      null,
      props.supplierId,
      props.companyName,
      props.fullName,
      props.email,
      props.phone,
      props.country,
      props.classification,
      props.creditLimitSar,
      props.paymentTerms,
      props.notes,
      new Date(),
      new Date(),
    );
  }

  static reconstitute(props: ReconstitutedManualClientProps): ManualClient {
    return new ManualClient(
      props._id,
      props.internalId,
      props.supplierId,
      props.companyName,
      props.fullName,
      props.email,
      props.phone,
      props.country,
      props.classification,
      props.creditLimitSar,
      props.paymentTerms,
      props.notes,
      props.createdAt,
      props.updatedAt,
    );
  }

  get id(): string {
    return this._id;
  }

  get internalId(): number | null {
    return this._internalId;
  }

  get supplierId(): number {
    return this._supplierId;
  }

  get companyName(): string {
    return this._companyName;
  }

  get fullName(): string {
    return this._fullName;
  }

  get email(): string {
    return this._email;
  }

  get phone(): string {
    return this._phone;
  }

  get country(): CountryCode {
    return this._country;
  }

  get classification(): ClientClassification {
    return this._classification;
  }

  get creditLimitSar(): number | null {
    return this._creditLimitSar;
  }

  get paymentTerms(): string | null {
    return this._paymentTerms;
  }

  get notes(): string | null {
    return this._notes;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }
}
