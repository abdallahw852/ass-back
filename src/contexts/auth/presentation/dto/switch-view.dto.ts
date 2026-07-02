import { IsIn } from 'class-validator';

export class SwitchViewDto {
  @IsIn(['buyer', 'supplier'])
  viewAs: 'buyer' | 'supplier';
}
