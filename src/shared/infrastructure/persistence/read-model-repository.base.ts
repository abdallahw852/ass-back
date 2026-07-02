import { Injectable, Inject } from '@nestjs/common';
import { DataSource, Repository, EntityTarget, ObjectLiteral } from 'typeorm';
import { ConnectionService } from './connection.service';

/**
 * Base repository for read model operations
 * Uses read connection for all queries
 */
@Injectable()
export abstract class ReadModelRepositoryBase<T extends ObjectLiteral> {
  protected abstract entity: EntityTarget<T>;

  constructor(
    @Inject(ConnectionService)
    protected readonly connectionService: ConnectionService,
  ) {}

  /**
   * Get repository using read connection
   */
  protected getRepository(): Repository<T> {
    return this.connectionService
      .getReadConnection()
      .getRepository<T>(this.entity);
  }
}

/**
 * Base repository for write model operations
 * Uses write connection for all commands
 */
@Injectable()
export abstract class WriteModelRepositoryBase<T extends ObjectLiteral> {
  protected abstract entity: EntityTarget<T>;

  constructor(
    @Inject(ConnectionService)
    protected readonly connectionService: ConnectionService,
  ) {}

  /**
   * Get repository using write connection
   */
  protected getRepository(): Repository<T> {
    return this.connectionService
      .getWriteConnection()
      .getRepository<T>(this.entity);
  }

  /**
   * Get write data source for transactions
   */
  protected getDataSource(): DataSource {
    return this.connectionService.getWriteConnection();
  }
}
