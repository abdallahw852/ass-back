import { IsBoolean } from 'class-validator';

export class SetPlanStatusDto {
  @IsBoolean()
  isActive: boolean;
}
