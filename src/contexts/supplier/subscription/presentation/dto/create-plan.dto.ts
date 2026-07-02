import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePlanDto {
  /** Internal unique identifier, e.g. "gold", "silver" */
  @IsString()
  @Length(1, 64)
  name: string;

  /** Arabic display name shown to users, e.g. "العضوية الذهبية" */
  @IsString()
  @Length(1, 128)
  displayNameAr: string;

  /** English display name shown to users, e.g. "Gold Membership" */
  @IsString()
  @Length(1, 128)
  displayNameEn: string;

  /** Price in the smallest currency unit fraction (0 = free) */
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price: number;

  /** ISO 4217 currency code, defaults to SAR */
  @IsOptional()
  @IsString()
  @Length(3, 8)
  currency?: string;

  /** Billing interval: "monthly" | "yearly" | "free" */
  @IsOptional()
  @IsIn(['monthly', 'yearly', 'free'])
  billingCycle?: string;

  /** Platform commission percentage taken upon sale (e.g. 3 = 3%) */
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  commissionRate: number;

  /**
   * Feature strings displayed on the plan card.
   * Arabic text is recommended to match the UI design.
   */
  @IsArray()
  @IsString({ each: true })
  features: string[];

  /** Whether the plan is visible and selectable by users */
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsObject()
  entitlements?: Record<string, number | boolean>;
}
