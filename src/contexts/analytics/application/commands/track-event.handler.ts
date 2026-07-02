import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TrackEventCommand } from './track-event.command';
import { AnalyticsEventOrmEntity } from '../../infrastructure/persistence/analytics-event.orm-entity';

@CommandHandler(TrackEventCommand)
export class TrackEventHandler implements ICommandHandler<TrackEventCommand> {
  constructor(
    @InjectRepository(AnalyticsEventOrmEntity, 'write')
    private readonly repo: Repository<AnalyticsEventOrmEntity>,
  ) {}

  async execute(command: TrackEventCommand): Promise<void> {
    await this.repo.save(
      this.repo.create({
        eventType: command.eventType,
        path: command.path,
        sessionId: command.sessionId,
        userId: command.userId ?? null,
        ip: command.ip ?? null,
        country: command.country ?? null,
        referrer: command.referrer ?? null,
        userAgent: command.userAgent ?? null,
        metadata: command.metadata ?? {},
      }),
    );
  }
}
