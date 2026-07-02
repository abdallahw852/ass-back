import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import type { FastifyRequest } from 'fastify';
import { SessionAuthGuard } from '../../../shared/infrastructure/guards/session-auth.guard';
import { IsFullyVerifiedSupplier } from '../../../shared/infrastructure/guards/is-fully-verified-supplier.guard';
import type { ISupplierRepository } from '../../supplier/identity/domain/repositories/supplier.repository.interface';
import { SUPPLIER_REPOSITORY } from '../../supplier/identity/domain/repositories/supplier.repository.interface';
import { UserOrmEntity } from '../../auth/infrastructure/persistence/user.orm-entity';
import { SupplierOrmEntity } from '../../supplier/identity/infrastructure/persistence/supplier.orm-entity';
import { SupplierNotFoundForUserException } from '../../client/domain/client.exceptions';

import { FileReturnRequestCommand } from '../application/commands/file-return-request.command';
import { ApproveReturnCommand } from '../application/commands/approve-return.command';
import { RejectReturnCommand } from '../application/commands/reject-return.command';
import { RefundReturnCommand } from '../application/commands/refund-return.command';
import { ListReturnRequestsQuery } from '../application/queries/list-return-requests.query';
import { GetReturnRequestQuery } from '../application/queries/get-return-request.query';
import type {
  ListReturnRequestsResult,
  ReturnRequestReadModel,
} from '../application/queries/list-return-requests.handler';

import { FileReturnRequestDto } from './dto/file-return-request.dto';
import { ListReturnsQueryDto } from './dto/list-returns-query.dto';
import { RejectReturnDto } from './dto/reject-return.dto';
import { RefundReturnDto } from './dto/refund-return.dto';

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

@Controller('returns')
@UseGuards(SessionAuthGuard, IsFullyVerifiedSupplier)
export class ReturnsController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
    @Inject(SUPPLIER_REPOSITORY)
    private readonly supplierRepository: ISupplierRepository,
    @InjectRepository(UserOrmEntity, 'write')
    private readonly userRepo: Repository<UserOrmEntity>,
    @InjectRepository(SupplierOrmEntity, 'write')
    private readonly supplierRepo: Repository<SupplierOrmEntity>,
  ) {}

  @Get()
  async listReturns(
    @Req() req: SessionRequest,
    @Query() dto: ListReturnsQueryDto,
  ): Promise<ListReturnRequestsResult> {
    const supplierId = await this.resolveSupplierId(req);
    return this.queryBus.execute(
      new ListReturnRequestsQuery(
        supplierId,
        dto.status,
        dto.page ?? 1,
        dto.limit ?? 20,
      ),
    );
  }

  @Get(':id')
  async getReturn(
    @Req() req: SessionRequest,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<ReturnRequestReadModel> {
    const supplierId = await this.resolveSupplierId(req);
    return this.queryBus.execute(new GetReturnRequestQuery(id, supplierId));
  }

  @Post()
  async fileReturn(
    @Req() req: SessionRequest,
    @Body() dto: FileReturnRequestDto,
  ): Promise<ReturnRequestReadModel> {
    const supplierId = await this.resolveSupplierId(req);
    return this.commandBus.execute(
      new FileReturnRequestCommand(
        dto.orderId,
        supplierId,
        req.session.user.id,
        dto.reason,
      ),
    );
  }

  @Post(':id/approve')
  async approveReturn(
    @Req() req: SessionRequest,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<ReturnRequestReadModel> {
    const supplierId = await this.resolveSupplierId(req);
    return this.commandBus.execute(
      new ApproveReturnCommand(id, supplierId, req.session.user.id),
    );
  }

  @Post(':id/reject')
  async rejectReturn(
    @Req() req: SessionRequest,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: RejectReturnDto,
  ): Promise<ReturnRequestReadModel> {
    const supplierId = await this.resolveSupplierId(req);
    return this.commandBus.execute(
      new RejectReturnCommand(id, supplierId, req.session.user.id, dto.reason),
    );
  }

  @Post(':id/refund')
  async refundReturn(
    @Req() req: SessionRequest,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: RefundReturnDto,
  ): Promise<ReturnRequestReadModel> {
    const supplierId = await this.resolveSupplierId(req);
    return this.commandBus.execute(
      new RefundReturnCommand(id, supplierId, req.session.user.id, dto.amount),
    );
  }

  private async resolveSupplierId(req: SessionRequest): Promise<number> {
    let supplier = await this.supplierRepository.findByUserId(
      req.session.user.id,
    );

    if (!supplier) {
      const user = await this.userRepo.findOne({
        where: { id: req.session.user.id },
        select: ['supplierId'],
      });
      if (user?.supplierId) {
        supplier = await this.supplierRepo.findOne({
          where: { id: user.supplierId },
        });
      }
    }

    if (!supplier) throw new SupplierNotFoundForUserException();
    return supplier.id;
  }
}
