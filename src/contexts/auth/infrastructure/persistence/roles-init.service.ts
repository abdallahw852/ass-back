import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoleOrmEntity } from './role.orm-entity';
import { RolePermissionOrmEntity } from './role-permission.orm-entity';

const MODULES = [
  'dashboard',
  'users',
  'products',
  'orders',
  'disputes',
  'payments',
  'reports',
  'settings',
];
const ACTIONS = ['view', 'create', 'edit', 'delete'];

const DEFAULT_ROLES: Array<{ id: string; name: string; description: string }> =
  [
    { id: 'admin', name: 'Administrator', description: 'Full platform access' },
    { id: 'supplier', name: 'Supplier', description: 'Supplier portal access' },
    { id: 'buyer', name: 'Buyer', description: 'Buyer portal access' },
  ];

const SUPPLIER_ALLOWED = new Set([
  'dashboard:view',
  'products:view',
  'products:create',
  'products:edit',
  'orders:view',
  'payments:view',
]);

const BUYER_ALLOWED = new Set([
  'dashboard:view',
  'products:view',
  'orders:view',
  'orders:create',
  'payments:view',
]);

@Injectable()
export class RolesInitService implements OnModuleInit {
  private readonly logger = new Logger(RolesInitService.name);

  constructor(
    @InjectRepository(RoleOrmEntity, 'write')
    private readonly roleRepo: Repository<RoleOrmEntity>,
    @InjectRepository(RolePermissionOrmEntity, 'write')
    private readonly permRepo: Repository<RolePermissionOrmEntity>,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      for (const role of DEFAULT_ROLES) {
        await this.roleRepo.upsert(role, ['id']);
      }

      for (const mod of MODULES) {
        for (const action of ACTIONS) {
          const key = `${mod}:${action}`;
          await this.permRepo.upsert(
            { role: 'admin', module: mod, action, allowed: true },
            { conflictPaths: ['role', 'module', 'action'] },
          );
          await this.permRepo.upsert(
            {
              role: 'supplier',
              module: mod,
              action,
              allowed: SUPPLIER_ALLOWED.has(key),
            },
            { conflictPaths: ['role', 'module', 'action'] },
          );
          await this.permRepo.upsert(
            {
              role: 'buyer',
              module: mod,
              action,
              allowed: BUYER_ALLOWED.has(key),
            },
            { conflictPaths: ['role', 'module', 'action'] },
          );
        }
      }
    } catch (err) {
      // Migration may not have run yet — seed will succeed on next startup
      this.logger.warn(`Roles seed skipped: ${(err as Error).message}`);
    }
  }
}
