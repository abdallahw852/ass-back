import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import * as geoip from 'geoip-lite';
import { LoginSucceededEvent } from '../../domain/events/login-succeeded.event';
import { LoginFailedEvent } from '../../domain/events/login-failed.event';
import { LOGIN_ACTIVITY_REPOSITORY } from '../../domain/repositories/login-activity.repository.interface';
import type { ILoginActivityRepository } from '../../domain/repositories/login-activity.repository.interface';

function parseDevice(userAgent: string): string {
  if (!userAgent) return 'Unknown';
  const ua = userAgent.toLowerCase();
  let browser = 'Unknown';
  let os = 'Unknown';

  if (ua.includes('edg/')) browser = 'Edge';
  else if (ua.includes('opr/') || ua.includes('opera')) browser = 'Opera';
  else if (ua.includes('chrome')) browser = 'Chrome';
  else if (ua.includes('safari')) browser = 'Safari';
  else if (ua.includes('firefox')) browser = 'Firefox';

  if (ua.includes('windows')) os = 'Windows';
  else if (ua.includes('android')) os = 'Android';
  else if (ua.includes('iphone') || ua.includes('ipad')) os = 'iOS';
  else if (ua.includes('macintosh') || ua.includes('mac os')) os = 'macOS';
  else if (ua.includes('linux')) os = 'Linux';

  return `${browser} - ${os}`;
}

function resolveLocation(ip: string): string | null {
  const geo = geoip.lookup(ip);
  if (!geo) return null;
  const parts = [geo.city, geo.country].filter(Boolean);
  return parts.length > 0 ? parts.join(' - ') : null;
}

@EventsHandler(LoginSucceededEvent, LoginFailedEvent)
export class LoginActivityListener implements IEventHandler<
  LoginSucceededEvent | LoginFailedEvent
> {
  constructor(
    @Inject(LOGIN_ACTIVITY_REPOSITORY)
    private readonly loginActivityRepo: ILoginActivityRepository,
  ) {}

  async handle(event: LoginSucceededEvent | LoginFailedEvent): Promise<void> {
    if (!event.userId) return;

    const isSuccess = event instanceof LoginSucceededEvent;
    const failureReason =
      !isSuccess && event instanceof LoginFailedEvent ? event.reason : null;

    await this.loginActivityRepo.create({
      userId: event.userId,
      ipAddress: event.ip || '0.0.0.0',
      location: resolveLocation(event.ip),
      userAgent: event.userAgent || '',
      device: parseDevice(event.userAgent || ''),
      status: isSuccess ? 'success' : 'failed',
      failureReason,
    });
  }
}
