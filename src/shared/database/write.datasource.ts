import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';

export const writeDataSource = (config: ConfigService): DataSource =>
  new DataSource({
    name: 'write',
    type: 'postgres',
    host: config.get<string>('database.write.host'),
    port: config.get<number>('database.write.port'),
    username: config.get<string>('database.write.username'),
    password: config.get<string>('database.write.password'),
    database: config.get<string>('database.write.database'),
    entities: [__dirname + '/../../**/*.orm-entity{.ts,.js}'],
    migrations: [__dirname + '/migrations/*{.ts,.js}'],
    synchronize: false,
    logging: process.env.NODE_ENV === 'development',
  });
