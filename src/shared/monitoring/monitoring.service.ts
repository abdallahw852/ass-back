import { Injectable } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';

interface Sample {
  ts: number;
  value: number;
}

@Injectable()
export class MonitoringService {
  private readonly cpuHistory: Sample[] = [];
  private readonly memoryHistory: Sample[] = [];
  private readonly recentErrors: string[] = [];

  private lastCpuUsage = process.cpuUsage();
  private lastSampleTs = Date.now();

  private readonly MAX_SAMPLES = 60;
  private readonly MAX_ERRORS = 50;
  private readonly INTERVAL_MS = 15000;

  @Interval(15000)
  sample(): void {
    const now = Date.now();
    const elapsedMs = now - this.lastSampleTs;

    // CPU usage delta
    const currentCpu = process.cpuUsage(this.lastCpuUsage);
    const totalCpuUs = currentCpu.user + currentCpu.system;
    const cpuPercent = Math.min(100, (totalCpuUs / (elapsedMs * 1000)) * 100);

    this.lastCpuUsage = process.cpuUsage();
    this.lastSampleTs = now;

    // Memory usage in MB
    const mem = process.memoryUsage();
    const memMB = Math.round(mem.rss / 1024 / 1024);

    this.pushSample(this.cpuHistory, {
      ts: now,
      value: Math.round(cpuPercent * 100) / 100,
    });
    this.pushSample(this.memoryHistory, { ts: now, value: memMB });
  }

  getCpuHistory(): Sample[] {
    return [...this.cpuHistory];
  }

  getMemoryHistory(): Sample[] {
    return [...this.memoryHistory];
  }

  getCurrentStats(): { cpuPercent: number; memMB: number; uptime: number } {
    const latestCpu = this.cpuHistory[this.cpuHistory.length - 1]?.value ?? 0;
    const latestMem =
      this.memoryHistory[this.memoryHistory.length - 1]?.value ?? 0;
    return {
      cpuPercent: latestCpu,
      memMB: latestMem,
      uptime: Math.round(process.uptime()),
    };
  }

  pushError(message: string): void {
    const ts = new Date().toISOString();
    const entry = `[${ts}] ${message}`;
    if (this.recentErrors.length >= this.MAX_ERRORS) {
      this.recentErrors.shift();
    }
    this.recentErrors.push(entry);
  }

  getRecentErrors(): string[] {
    return [...this.recentErrors];
  }

  private pushSample(buffer: Sample[], sample: Sample): void {
    if (buffer.length >= this.MAX_SAMPLES) {
      buffer.shift();
    }
    buffer.push(sample);
  }
}
