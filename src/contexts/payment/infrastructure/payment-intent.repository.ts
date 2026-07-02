import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IPaymentRecordRepository } from '../domain/payment-intent.repository.interface';
import { PaymentRecordOrmEntity } from './persistence/payment-intent.orm-entity';

@Injectable()
export class PaymentRecordRepository implements IPaymentRecordRepository {
  constructor(
    @InjectRepository(PaymentRecordOrmEntity, 'write')
    private readonly repository: Repository<PaymentRecordOrmEntity>,
  ) {}

  findByPaymentIntentId(
    intentId: string,
  ): Promise<PaymentRecordOrmEntity | null> {
    return this.repository.findOne({ where: { paymentIntentId: intentId } });
  }

  findByPaymobOrderId(
    paymobOrderId: string,
  ): Promise<PaymentRecordOrmEntity | null> {
    return this.repository.findOne({ where: { paymobOrderId } });
  }

  save(
    input: Partial<PaymentRecordOrmEntity>,
  ): Promise<PaymentRecordOrmEntity> {
    const entity = this.repository.create(input);
    return this.repository.save(entity);
  }
}
