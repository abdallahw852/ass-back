import { IsOptional, IsString } from 'class-validator';

export class AnalyticsFilterDto {
  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;
}

export class TrackEventDto {
  @IsString()
  type: string;

  @IsString()
  path: string;

  @IsOptional()
  @IsString()
  referrer?: string;

  @IsOptional()
  @IsString()
  sessionId?: string;
}
