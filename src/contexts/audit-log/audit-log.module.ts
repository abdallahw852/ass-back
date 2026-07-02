import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditEventOrmEntity } from './infrastructure/persistence/audit-event.orm-entity';
import { AppendAuditEventHandler } from './application/commands/append-audit-event.handler';
import { ListAuditEventsHandler } from './application/queries/list-audit-events.handler';
import { AuditLogListener } from './presentation/event-listeners/audit-log.listener';
import { AuditLogController } from './presentation/audit-log.controller';

const commandHandlers = [AppendAuditEventHandler];
const queryHandlers = [ListAuditEventsHandler];

@Module({
  imports: [
    CqrsModule,
    TypeOrmModule.forFeature([AuditEventOrmEntity], 'write'),
  ],
  controllers: [AuditLogController],
  providers: [...commandHandlers, ...queryHandlers, AuditLogListener],
  exports: [AppendAuditEventHandler, TypeOrmModule],
})
export class AuditLogModule {}
