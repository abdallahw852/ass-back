import { Injectable, Inject, Optional } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { getDataSourceToken } from '@nestjs/typeorm';

export const READ_CONNECTION = 'READ_CONNECTION';
export const WRITE_CONNECTION = 'WRITE_CONNECTION';

/**
 * Service to provide read/write database connections
 * Aligns with CQRS pattern: queries use read, commands use write
 */
@Injectable()
export class ConnectionService {
  constructor(
    @Inject(getDataSourceToken('read'))
    @Optional()
    private readonly readDataSource: DataSource | null,
    @Inject(getDataSourceToken('write'))
    @Optional()
    private readonly writeDataSource: DataSource | null,
  ) {}

  /**
   * Get read connection for queries
   * Falls back to write connection if read is not available
   */
  getReadConnection(): DataSource {
    if (this.readDataSource) {
      return this.readDataSource;
    }
    if (this.writeDataSource) {
      return this.writeDataSource;
    }
    throw new Error('No database connection available');
  }

  /**
   * Get write connection for commands
   */
  getWriteConnection(): DataSource {
    if (!this.writeDataSource) {
      throw new Error('Write database connection is required');
    }
    return this.writeDataSource;
  }
}
