import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SessionAuthGuard } from '../../../shared/infrastructure/guards/session-auth.guard';
import { AdminGuard } from '../../../shared/guards/admin.guard';
import type { IPlatformShippingPort } from '../application/ports/platform-shipping.port';
import { PLATFORM_SHIPPING_PORT } from '../application/ports/platform-shipping.port';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';

@Controller('admin/shipping/warehouses')
@UseGuards(SessionAuthGuard, AdminGuard)
export class AdminWarehousesController {
  constructor(
    @Inject(PLATFORM_SHIPPING_PORT)
    private readonly platformShipping: IPlatformShippingPort,
  ) {}

  @Post()
  async createWarehouse(
    @Body() dto: CreateWarehouseDto,
  ): Promise<Record<string, unknown>> {
    return this.platformShipping.createWarehouse(dto);
  }

  @Get()
  async listWarehouses(
    @Query('page') page?: string,
  ): Promise<Record<string, unknown>> {
    return this.platformShipping.listWarehouses(
      page != null ? Number(page) : undefined,
    );
  }

  @Get(':code')
  async getWarehouse(
    @Param('code') code: string,
  ): Promise<Record<string, unknown>> {
    return this.platformShipping.getWarehouse(code);
  }
}
