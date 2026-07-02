import { IsUUID } from 'class-validator';

export class SubscribeDto {
  @IsUUID('all', { message: 'Please provide a valid plan ID.' })
  planId: string;
}
