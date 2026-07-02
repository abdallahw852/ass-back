import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { SessionAuthGuard } from '../../../shared/infrastructure/guards/session-auth.guard';
import { AdminGuard } from '../../../shared/guards/admin.guard';
import { ListAuditEventsQuery } from '../application/queries/list-audit-events.query';
import { AuditEventFilterDto } from './dto/audit-event-filter.dto';
import type { PaginatedAuditEvents } from '../application/queries/list-audit-events.handler';

@Controller('admin/audit-log')
@UseGuards(SessionAuthGuard, AdminGuard)
export class AuditLogController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  async listAuditEvents(
    @Query() dto: AuditEventFilterDto,
  ): Promise<PaginatedAuditEvents> {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const offset = (page - 1) * limit;
    return this.queryBus.execute(
      new ListAuditEventsQuery(
        dto.entityType,
        dto.entityId,
        limit,
        offset,
        dto.actorId,
        dto.action,
        page,
      ),
    );
  }
}
