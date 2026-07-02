import { IsArray, IsOptional, IsUUID } from 'class-validator';

export class CheckoutCartDto {
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  itemIds?: string[];
}
