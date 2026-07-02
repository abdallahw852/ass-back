import { IsUUID } from 'class-validator';

export class CreatePaymentIntentDto {
  @IsUUID('all', { message: 'Please provide a valid subscription ID.' })
  subscriptionId: string;
}
