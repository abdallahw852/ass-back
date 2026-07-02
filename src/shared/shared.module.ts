import { Module } from '@nestjs/common';
import { EmailService } from './infrastructure/services/email.service';
import { OtpService } from './infrastructure/services/otp.service';
import { RedisService } from './infrastructure/services/redis.service';
import { StorageService } from './infrastructure/services/storage.service';
import { PaymentService } from './infrastructure/services/payment.service';
import { ConnectionService } from './infrastructure/persistence/connection.service';

@Module({
  providers: [
    EmailService,
    OtpService,
    RedisService,
    StorageService,
    PaymentService,
    ConnectionService,
  ],
  exports: [
    EmailService,
    OtpService,
    RedisService,
    StorageService,
    PaymentService,
    ConnectionService,
  ],
})
export class SharedModule {}
