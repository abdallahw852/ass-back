import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import type { FastifyRequest } from 'fastify';
import { SessionAuthGuard } from '../../../shared/infrastructure/guards/session-auth.guard';
import { IsFullyVerifiedSupplier } from '../../../shared/infrastructure/guards/is-fully-verified-supplier.guard';
import { StorageService } from '../../../shared/infrastructure/services/storage.service';
import type { ISupplierRepository } from '../../supplier/identity/domain/repositories/supplier.repository.interface';
import { SUPPLIER_REPOSITORY } from '../../supplier/identity/domain/repositories/supplier.repository.interface';
import { InventoryFormatter } from './inventory.formatter';
import type {
  InventoryListRow,
  InventoryDetailRow,
} from '../infrastructure/repositories/inventory-item-read.repository';

import { AdjustStockCommand } from '../application/commands/adjust-stock.command';
import { SetMinThresholdCommand } from '../application/commands/set-min-threshold.command';

import { ListInventoryItemsQuery } from '../application/queries/list-inventory-items.query';
import { GetInventoryStatsQuery } from '../application/queries/get-inventory-stats.query';
import { GetInventoryItemQuery } from '../application/queries/get-inventory-item.query';
import { ListStockMovementsQuery } from '../application/queries/list-stock-movements.query';

import { AdjustStockDto } from './dto/adjust-stock.dto';
import { SetMinThresholdDto } from './dto/set-min-threshold.dto';
import { ListInventoryItemsQueryDto } from './dto/list-inventory-items-query.dto';
import { ListMovementsQueryDto } from './dto/list-movements-query.dto';

type SessionRequest = FastifyRequest & {
  session: {
    user: {
      id: number;
      _id: string;
      email: string;
      role: string;
      verifiedAt: Date | null;
    };
  };
};

@UseGuards(SessionAuthGuard, IsFullyVerifiedSupplier)
@Controller('inventory')
export class InventoryController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly storage: StorageService,
    @Inject(SUPPLIER_REPOSITORY)
    private readonly supplierRepository: ISupplierRepository,
  ) {}

  private async resolveSupplierId(req: SessionRequest): Promise<number> {
    const supplier = await this.supplierRepository.findByUserId(
      req.session.user.id,
    );
    if (!supplier) {
      throw new BadRequestException('No supplier profile found for this user.');
    }
    return supplier.id;
  }

  @Get()
  async list(
    @Req() req: SessionRequest,
    @Query() query: ListInventoryItemsQueryDto,
  ) {
    const supplierId = await this.resolveSupplierId(req);
    const result = await this.queryBus.execute<
      ListInventoryItemsQuery,
      {
        data: InventoryListRow[];
        total: number;
        page: number;
        pageSize: number;
      }
    >(
      new ListInventoryItemsQuery(
        supplierId,
        query.status ?? 'all',
        query.search,
        query.page ?? 1,
        query.pageSize ?? 20,
      ),
    );
    return InventoryFormatter.list(result, this.storage);
  }

  @Get('stats')
  async stats(@Req() req: SessionRequest) {
    const supplierId = await this.resolveSupplierId(req);
    return this.queryBus.execute<GetInventoryStatsQuery, unknown>(
      new GetInventoryStatsQuery(supplierId),
    );
  }

  @Get(':id')
  async detail(
    @Req() req: SessionRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const supplierId = await this.resolveSupplierId(req);
    const result = await this.queryBus.execute<
      GetInventoryItemQuery,
      InventoryDetailRow
    >(new GetInventoryItemQuery(id, supplierId));
    return InventoryFormatter.detail(result, this.storage);
  }

  @Patch(':id/stock')
  async adjustStock(
    @Req() req: SessionRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdjustStockDto,
  ) {
    const supplierId = await this.resolveSupplierId(req);
    return this.commandBus.execute<AdjustStockCommand, unknown>(
      new AdjustStockCommand(
        id,
        supplierId,
        dto.value,
        dto.reason,
        req.session.user.id,
        dto.note,
      ),
    );
  }

  @Patch(':id/min-threshold')
  async setMinThreshold(
    @Req() req: SessionRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetMinThresholdDto,
  ) {
    const supplierId = await this.resolveSupplierId(req);
    return this.commandBus.execute<SetMinThresholdCommand, unknown>(
      new SetMinThresholdCommand(id, supplierId, dto.threshold),
    );
  }

  @Get(':id/movements')
  async movements(
    @Req() req: SessionRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: ListMovementsQueryDto,
  ) {
    const supplierId = await this.resolveSupplierId(req);
    return this.queryBus.execute<ListStockMovementsQuery, unknown>(
      new ListStockMovementsQuery(
        id,
        supplierId,
        query.reason,
        query.from ? new Date(query.from) : undefined,
        query.to ? new Date(query.to) : undefined,
        query.page ?? 1,
      ),
    );
  }
}
