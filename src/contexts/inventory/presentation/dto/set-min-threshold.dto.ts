import { IsInt, Min } from 'class-validator';

export class SetMinThresholdDto {
  @IsInt()
  @Min(0)
  threshold: number;
}
