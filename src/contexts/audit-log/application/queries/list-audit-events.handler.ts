import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ListAuditEventsQuery } from './list-audit-events.query';
import { AuditEventOrmEntity } from '../../infrastructure/persistence/audit-event.orm-entity';

export interface PaginatedAuditEvents {
  items: AuditEventOrmEntity[];
  total: number;
  page: number;
  limit: number;
}

@QueryHandler(ListAuditEventsQuery)
export class ListAuditEventsHandler implements IQueryHandler<ListAuditEventsQuery> {
  constructor(
    @InjectRepository(AuditEventOrmEntity, 'write')
    private readonly repo: Repository<AuditEventOrmEntity>,
  ) {}

  async execute(query: ListAuditEventsQuery): Promise<PaginatedAuditEvents> {
    const qb = this.repo
      .createQueryBuilder('ae')
      .orderBy('ae.created_at', 'DESC');

    if (query.entityType) {
      qb.andWhere('ae.entity_type = :entityType', {
        entityType: query.entityType,
      });
    }
    if (query.entityId) {
      qb.andWhere('ae.entity_id = :entityId', { entityId: query.entityId });
    }
    if (query.actorId !== undefined && query.actorId !== null) {
      qb.andWhere('ae.actor_id = :actorId', { actorId: query.actorId });
    }
    if (query.action) {
      qb.andWhere('ae.event_name = :action', { action: query.action });
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    qb.skip(skip).take(limit);

    const [items, total] = await qb.getManyAndCount();

    return { items, total, page, limit };
  }
}
