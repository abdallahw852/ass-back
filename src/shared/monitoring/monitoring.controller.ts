import { Controller, Get, UseGuards } from '@nestjs/common';
import { SessionAuthGuard } from '../infrastructure/guards/session-auth.guard';
import { AdminGuard } from '../guards/admin.guard';
import { MonitoringService } from './monitoring.service';

@Controller('admin/monitoring')
@UseGuards(SessionAuthGuard, AdminGuard)
export class MonitoringController {
  constructor(private readonly monitoringService: MonitoringService) {}

  @Get()
  getStats(): {
    current: { cpuPercent: number; memMB: number; uptime: number };
    cpuHistory: Array<{ ts: number; value: number }>;
    memoryHistory: Array<{ ts: number; value: number }>;
    recentErrors: string[];
  } {
    return {
      current: this.monitoringService.getCurrentStats(),
      cpuHistory: this.monitoringService.getCpuHistory(),
      memoryHistory: this.monitoringService.getMemoryHistory(),
      recentErrors: this.monitoringService.getRecentErrors(),
    };
  }
}
