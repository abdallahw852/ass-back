import { Module } from '@nestjs/common';
import { MediaController } from './presentation/media.controller';
import { MediaService } from './application/media.service';

@Module({
  controllers: [MediaController],
  providers: [MediaService],
})
export class MediaModule {}
