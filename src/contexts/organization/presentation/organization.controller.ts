import {
  Body,
  ConflictException,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { type Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import type { FastifyRequest } from 'fastify';
import { SessionAuthGuard } from '../../../shared/infrastructure/guards/session-auth.guard';
import { AllowUnverified } from '../../../shared/decorators/allow-unverified.decorator';
import { InviteMemberDto } from './dto/invite-member.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { InviteMemberCommand } from '../application/commands/invite-member.command';
import { RemoveMemberCommand } from '../application/commands/remove-member.command';
import { ListMembersQuery } from '../application/queries/list-members.query';
import { UserOrmEntity } from '../../auth/infrastructure/persistence/user.orm-entity';
import { SupplierMemberOrmEntity } from '../infrastructure/persistence/supplier-member.orm-entity';
import { SupplierOrmEntity } from '../../supplier/identity/infrastructure/persistence/supplier.orm-entity';
import { UserRole } from '../../auth/domain/enums/user-role.enum';
import type { MemberResult } from '../application/queries/list-members.handler';

const BCRYPT_COST = 12;

type SessionRequest = FastifyRequest & {
  session: {
    user: {
      id: number;
      _id: string;
      email: string;
      role: string;
      verifiedAt: Date | null;
    };
  };
};

@Controller('organization')
export class OrganizationController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    @InjectRepository(UserOrmEntity, 'write')
    private readonly userRepo: Repository<UserOrmEntity>,
    @InjectRepository(SupplierMemberOrmEntity, 'write')
    private readonly memberRepo: Repository<SupplierMemberOrmEntity>,
    @InjectRepository(SupplierOrmEntity, 'write')
    private readonly supplierRepo: Repository<SupplierOrmEntity>,
  ) {}

  private async resolveSupplierIdOrThrow(userId: number): Promise<number> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: ['supplierId'],
    });
    if (!user?.supplierId) {
      throw new ForbiddenException('Access restricted to supplier accounts.');
    }
    return user.supplierId;
  }

  @Get('members')
  @UseGuards(SessionAuthGuard)
  async listMembers(
    @Req() req: FastifyRequest,
  ): Promise<{ members: MemberResult[] }> {
    const sessionUser = (req as SessionRequest).session.user;
    const supplierId = await this.resolveSupplierIdOrThrow(sessionUser.id);

    const members = await this.queryBus.execute(
      new ListMembersQuery(supplierId),
    );

    return { members };
  }

  @Post('invite')
  @UseGuards(SessionAuthGuard)
  async inviteMember(
    @Body() dto: InviteMemberDto,
    @Req() req: FastifyRequest,
  ): Promise<{ id: string }> {
    const sessionUser = (req as SessionRequest).session.user;
    const supplierId = await this.resolveSupplierIdOrThrow(sessionUser.id);

    return this.commandBus.execute(
      new InviteMemberCommand(
        supplierId,
        dto.name,
        dto.email,
        dto.jobRole,
        dto.permissions,
      ),
    );
  }

  @Delete('members/:memberId')
  @UseGuards(SessionAuthGuard)
  async removeMember(
    @Param('memberId') memberId: string,
    @Req() req: FastifyRequest,
  ): Promise<void> {
    const sessionUser = (req as SessionRequest).session.user;
    const supplierId = await this.resolveSupplierIdOrThrow(sessionUser.id);

    await this.commandBus.execute(
      new RemoveMemberCommand(memberId, supplierId),
    );
  }

  @Get('invites/:token')
  @AllowUnverified()
  async getInvitePreview(@Param('token') token: string): Promise<{
    name: string;
    email: string;
    jobRole: string;
    organizationName: string;
  }> {
    const invite = await this.memberRepo.findOne({
      where: { invite_token: token, status: 'pending' },
    });

    if (!invite) {
      throw new NotFoundException('Invite not found or already used');
    }

    const supplier = await this.supplierRepo.findOne({
      where: { id: invite.supplier_id },
      select: ['companyName'],
    });

    return {
      name: invite.invited_name,
      email: invite.invited_email,
      jobRole: invite.job_role,
      organizationName: supplier?.companyName ?? '',
    };
  }

  @Post('invites/:token/accept')
  @AllowUnverified()
  async acceptInvite(
    @Param('token') token: string,
    @Body() dto: AcceptInviteDto,
  ): Promise<{ ok: boolean }> {
    const invite = await this.memberRepo.findOne({
      where: { invite_token: token, status: 'pending' },
    });

    if (!invite) {
      throw new NotFoundException('Invite not found or already used');
    }

    const existingUser = await this.userRepo.findOne({
      where: { email: invite.invited_email },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_COST);

    const newUser = this.userRepo.create({
      email: invite.invited_email,
      name: invite.invited_name,
      role: UserRole.SUPPLIER_EMPLOYEE,
      supplierId: invite.supplier_id,
      passwordHash,
      verifiedAt: new Date(),
    });

    const savedUser = await this.userRepo.save(newUser);

    await this.memberRepo.update(invite.id, {
      status: 'active',
      user_id: savedUser.id,
    });

    return { ok: true };
  }
}
