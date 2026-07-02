import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { AllowUnverified } from './shared/decorators/allow-unverified.decorator';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @AllowUnverified()
  @Get('health')
  checkHealth() {
    return { status: 'healthy', timestamp: new Date().toISOString() };
  }
}
