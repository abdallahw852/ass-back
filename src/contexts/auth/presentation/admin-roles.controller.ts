import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { FastifyRequest } from 'fastify';
import { SessionAuthGuard } from '../../../shared/infrastructure/guards/session-auth.guard';
import { AdminGuard } from '../../../shared/guards/admin.guard';
import { RoleOrmEntity } from '../infrastructure/persistence/role.orm-entity';
import { RolePermissionOrmEntity } from '../infrastructure/persistence/role-permission.orm-entity';
import { AppendAuditEventCommand } from '../../audit-log/application/commands/append-audit-event.command';
import { IsArray, IsBoolean, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class PermissionItemDto {
  @IsString()
  module: string;

  @IsString()
  action: string;

  @IsBoolean()
  allowed: boolean;
}

class UpdateRolePermissionsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PermissionItemDto)
  permissions: PermissionItemDto[];
}

type SessionRequest = FastifyRequest & {
  session: { user: { id: number; _id: string; role: string } };
};

@Controller('admin/roles')
@UseGuards(SessionAuthGuard, AdminGuard)
export class AdminRolesController {
  constructor(
    private readonly commandBus: CommandBus,
    @InjectRepository(RoleOrmEntity, 'write')
    private readonly roleRepo: Repository<RoleOrmEntity>,
    @InjectRepository(RolePermissionOrmEntity, 'write')
    private readonly permRepo: Repository<RolePermissionOrmEntity>,
  ) {}

  @Get()
  async getRolesAndPermissions(): Promise<{
    roles: Array<{ id: string; name: string; description: string | null }>;
    permissions: Array<{
      role: string;
      module: string;
      action: string;
      allowed: boolean;
    }>;
  }> {
    const [roles, permissions] = await Promise.all([
      this.roleRepo.find(),
      this.permRepo.find(),
    ]);

    return {
      roles: roles.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
      })),
      permissions: permissions.map((p) => ({
        role: p.role,
        module: p.module,
        action: p.action,
        allowed: p.allowed,
      })),
    };
  }

  @Patch(':role/permissions')
  async updateRolePermissions(
    @Param('role') role: string,
    @Body() dto: UpdateRolePermissionsDto,
    @Req() req: SessionRequest,
  ): Promise<{ updated: number }> {
    for (const perm of dto.permissions) {
      await this.permRepo.upsert(
        {
          role,
          module: perm.module,
          action: perm.action,
          allowed: perm.allowed,
        },
        { conflictPaths: ['role', 'module', 'action'] },
      );
    }

    // A8: Audit dispatch
    await this.commandBus.execute(
      new AppendAuditEventCommand(
        'role',
        role,
        'permissions_updated',
        req.session.user.id,
        req.session.user.role,
        { permissions: dto.permissions },
      ),
    );

    return { updated: dto.permissions.length };
  }
}
