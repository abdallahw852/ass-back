import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { AppendAuditEventCommand } from './append-audit-event.command';
import { AuditEventOrmEntity } from '../../infrastructure/persistence/audit-event.orm-entity';

@CommandHandler(AppendAuditEventCommand)
export class AppendAuditEventHandler implements ICommandHandler<AppendAuditEventCommand> {
  constructor(
    @InjectRepository(AuditEventOrmEntity, 'write')
    private readonly repo: Repository<AuditEventOrmEntity>,
  ) {}

  async execute(command: AppendAuditEventCommand): Promise<void> {
    await this.repo.save(
      this.repo.create({
        _id: randomUUID(),
        entity_type: command.entityType,
        entity_id: command.entityId,
        event_name: command.eventName,
        actor_id: command.actorId,
        actor_role: command.actorRole,
        payload: command.payload,
        correlation_id: command.correlationId ?? null,
      }),
    );
  }
}
