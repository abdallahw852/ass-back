import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';

export const readDataSource = (config: ConfigService): DataSource =>
  new DataSource({
    name: 'read',
    type: 'postgres',
    host: config.get<string>('database.read.host'),
    port: config.get<number>('database.read.port'),
    username: config.get<string>('database.read.username'),
    password: config.get<string>('database.read.password'),
    database: config.get<string>('database.read.database'),
    entities: [
      __dirname + '/../../**/*.read-model{.ts,.js}',
      __dirname + '/../../**/*.orm-entity{.ts,.js}',
    ],
    synchronize: false,
    logging: false,
  });
