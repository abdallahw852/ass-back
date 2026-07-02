import { Module } from '@nestjs/common';
import { SupportController } from './presentation/support.controller';
import { SupportService } from './application/support.service';

@Module({
  controllers: [SupportController],
  providers: [SupportService],
})
export class SupportModule {}
