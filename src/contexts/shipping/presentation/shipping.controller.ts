import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Logger,
  Param,
  Post,
  Query,
  RawBodyRequest,
  Request,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';
import type { FastifyRequest } from 'fastify';
import { SessionAuthGuard } from '../../../shared/infrastructure/guards/session-auth.guard';
import { TrackShipmentQuery } from '../application/queries/track-shipment.query';
import { GetShippingRatesQuery } from '../application/queries/get-shipping-rates.query';
import {
  UpdateShipmentFromWebhookCommand,
  type TorodWebhookPayload,
} from '../application/commands/update-shipment-from-webhook.command';
import type { IPlatformShippingPort } from '../application/ports/platform-shipping.port';
import { PLATFORM_SHIPPING_PORT } from '../application/ports/platform-shipping.port';
import { RedisService } from '../../../shared/infrastructure/services/redis.service';

interface AuthenticatedRequest {
  session: { user: { id: number } };
}

@Controller('shipping')
export class ShippingController {
  private readonly logger = new Logger(ShippingController.name);
  private readonly webhookSecret: string;

  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
    private readonly configService: ConfigService,
    @Inject(PLATFORM_SHIPPING_PORT)
    private readonly platformShipping: IPlatformShippingPort,
    private readonly redisService: RedisService,
  ) {
    this.webhookSecret =
      this.configService.get<string>('TOROD_WEBHOOK_SECRET') || '';
  }

  @Get('orders/:orderId/tracking')
  @UseGuards(SessionAuthGuard)
  async trackOrderShipment(
    @Request() req: AuthenticatedRequest,
    @Param('orderId') orderId: string,
  ): Promise<Record<string, unknown>> {
    return this.queryBus.execute(
      new TrackShipmentQuery(orderId, req.session.user.id),
    );
  }

  @Post('rates')
  @UseGuards(SessionAuthGuard)
  async getShippingRates(
    @Request() req: AuthenticatedRequest,
    @Body() body: { supplierId: number },
  ): Promise<Record<string, unknown>[]> {
    if (!body.supplierId) {
      throw new BadRequestException('supplierId is required.');
    }
    return this.queryBus.execute(
      new GetShippingRatesQuery(body.supplierId, req.session.user.id),
    );
  }

  @Get('torod/cities')
  @UseGuards(SessionAuthGuard)
  async getTorodCities(
    @Query('regionId') regionId?: string,
  ): Promise<Record<string, unknown>> {
    return this.torodGeoProxy('cities', regionId);
  }

  @Get('torod/regions')
  @UseGuards(SessionAuthGuard)
  async getTorodRegions(
    @Query('countryId') countryId?: string,
  ): Promise<Record<string, unknown>> {
    return this.torodGeoProxy('regions', countryId);
  }

  @Get('torod/countries')
  @UseGuards(SessionAuthGuard)
  async getTorodCountries(): Promise<Record<string, unknown>> {
    return this.torodGeoProxy('countries', undefined);
  }

  @Post('webhooks/torod')
  @HttpCode(200)
  async handleTorodWebhook(
    @Request() req: FastifyRequest & RawBodyRequest<FastifyRequest>,
    @Body() body: TorodWebhookPayload,
  ): Promise<{ received: boolean }> {
    const authHeader = req.headers['authorization'] ?? '';

    if (!this.webhookSecret) {
      this.logger.warn(
        'TOROD_WEBHOOK_SECRET not configured — rejecting webhook.',
      );
      throw new UnauthorizedException();
    }

    const secretBuf = Buffer.from(this.webhookSecret, 'utf8');
    const headerBuf = Buffer.from(authHeader, 'utf8');

    const authorized =
      secretBuf.length === headerBuf.length &&
      timingSafeEqual(secretBuf, headerBuf);

    if (!authorized) {
      throw new UnauthorizedException();
    }

    await this.commandBus.execute(new UpdateShipmentFromWebhookCommand(body));

    return { received: true };
  }

  private async torodGeoProxy(
    resource: 'cities' | 'regions' | 'countries',
    filterId?: string,
  ): Promise<Record<string, unknown>> {
    const cacheKey = `torod:geo:${resource}:${filterId ?? 'all'}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as Record<string, unknown>;
    }

    const data = await this.platformShipping.getGeo(resource, filterId);
    await this.redisService.set(cacheKey, JSON.stringify(data), 86400);
    return data;
  }
}
