import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SharedModule } from '../../shared/shared.module';

// ── Presentation ──────────────────────────────────────────────
import { OrganizationController } from './presentation/organization.controller';

// ── ORM entities ──────────────────────────────────────────────
import { SupplierMemberOrmEntity } from './infrastructure/persistence/supplier-member.orm-entity';
import { UserOrmEntity } from '../auth/infrastructure/persistence/user.orm-entity';
import { SupplierOrmEntity } from '../supplier/identity/infrastructure/persistence/supplier.orm-entity';

// ── Command handlers ──────────────────────────────────────────
import { InviteMemberHandler } from './application/commands/invite-member.handler';
import { RemoveMemberHandler } from './application/commands/remove-member.handler';

// ── Query handlers ────────────────────────────────────────────
import { ListMembersHandler } from './application/queries/list-members.handler';

@Module({
  imports: [
    CqrsModule,
    SharedModule,
    TypeOrmModule.forFeature([SupplierMemberOrmEntity], 'write'),
    TypeOrmModule.forFeature([UserOrmEntity], 'write'),
    TypeOrmModule.forFeature([SupplierOrmEntity], 'write'),
  ],
  controllers: [OrganizationController],
  providers: [InviteMemberHandler, RemoveMemberHandler, ListMembersHandler],
})
export class OrganizationModule {}
