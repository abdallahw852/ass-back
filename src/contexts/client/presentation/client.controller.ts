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
import { SupplierNotFoundForUserException } from '../domain/client.exceptions';

import { CreateManualClientCommand } from '../application/commands/create-manual-client.command';
import { ListClientsQuery } from '../application/queries/list-clients.query';
import { GetClientQuery } from '../application/queries/get-client.query';
import { GetClientStatsQuery } from '../application/queries/get-client-stats.query';
import { GetClientOrdersQuery } from '../application/queries/get-client-orders.query';
import { GetClientQuotationsQuery } from '../application/queries/get-client-quotations.query';
import { GetClientSampleRequestsQuery } from '../application/queries/get-client-sample-requests.query';
import { GetClientChatThreadsQuery } from '../application/queries/get-client-chat-threads.query';
import { GetClientNotesQuery } from '../application/queries/get-client-notes.query';

import { CreateClientDto } from './dto/create-client.dto';
import { ListClientsQueryDto } from './dto/list-clients-query.dto';
import { PaginatedQueryDto } from './dto/paginated-query.dto';
import { ClientFormatter } from './client.formatter';

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

interface PaginatedResult {
  items: Record<string, unknown>[];
  total: number;
  page: number;
  limit: number;
}

interface ListClientsResult extends PaginatedResult {
  summary: Record<string, unknown>;
}

interface StubResult {
  items: unknown[];
  total: number;
  page: number;
  limit: number;
}

@Controller('clients')
@UseGuards(SessionAuthGuard, IsFullyVerifiedSupplier)
export class ClientController {
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
  async listClients(
    @Req() req: SessionRequest,
    @Query() dto: ListClientsQueryDto,
  ) {
    const supplierId = await this.resolveSupplierId(req);
    const result = await this.queryBus.execute<
      ListClientsQuery,
      ListClientsResult
    >(
      new ListClientsQuery(supplierId, {
        search: dto.search,
        status: dto.status,
        classification: dto.classification,
        country: dto.country,
        dateAdded: dto.dateAdded,
        page: dto.page ?? 1,
        limit: dto.limit ?? 20,
      }),
    );
    return {
      items: result.items.map((item) => ClientFormatter.clientRow(item)),
      total: result.total,
      page: result.page,
      limit: result.limit,
      summary: result.summary,
    };
  }

  @Post()
  async createClient(@Req() req: SessionRequest, @Body() dto: CreateClientDto) {
    const supplierId = await this.resolveSupplierId(req);
    const result = await this.commandBus.execute<
      CreateManualClientCommand,
      { client: Record<string, unknown> }
    >(
      new CreateManualClientCommand(supplierId, {
        companyName: dto.companyName,
        fullName: dto.fullName,
        email: dto.email,
        phone: dto.phone,
        country: dto.country,
        segment: dto.segment,
        creditLimitSar: dto.creditLimit ?? null,
        paymentTerms: dto.paymentTerms ?? null,
        notes: dto.notes ?? null,
      }),
    );
    return { client: ClientFormatter.clientRow(result.client) };
  }

  @Get(':buyerId')
  async getClient(
    @Req() req: SessionRequest,
    @Param('buyerId', new ParseUUIDPipe({ version: '4' })) buyerId: string,
  ) {
    const supplierId = await this.resolveSupplierId(req);
    const result = await this.queryBus.execute<
      GetClientQuery,
      Record<string, unknown>
    >(new GetClientQuery(supplierId, buyerId));
    return ClientFormatter.clientHeader(result);
  }

  @Get(':buyerId/stats')
  async getClientStats(
    @Req() req: SessionRequest,
    @Param('buyerId', new ParseUUIDPipe({ version: '4' })) buyerId: string,
  ) {
    const supplierId = await this.resolveSupplierId(req);
    const result = await this.queryBus.execute<
      GetClientStatsQuery,
      Record<string, unknown>
    >(new GetClientStatsQuery(supplierId, buyerId));
    return ClientFormatter.clientStats(result);
  }

  @Get(':buyerId/orders')
  async getClientOrders(
    @Req() req: SessionRequest,
    @Param('buyerId', new ParseUUIDPipe({ version: '4' })) buyerId: string,
    @Query() dto: PaginatedQueryDto,
  ) {
    const supplierId = await this.resolveSupplierId(req);
    const result = await this.queryBus.execute<
      GetClientOrdersQuery,
      PaginatedResult
    >(
      new GetClientOrdersQuery(
        supplierId,
        buyerId,
        dto.page ?? 1,
        dto.limit ?? 20,
      ),
    );
    return {
      items: result.items.map((item) => ClientFormatter.orderRow(item)),
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }

  @Get(':buyerId/quotations')
  async getClientQuotations(
    @Req() req: SessionRequest,
    @Param('buyerId', new ParseUUIDPipe({ version: '4' })) buyerId: string,
    @Query() dto: PaginatedQueryDto,
  ) {
    const supplierId = await this.resolveSupplierId(req);
    const result = await this.queryBus.execute<
      GetClientQuotationsQuery,
      PaginatedResult
    >(
      new GetClientQuotationsQuery(
        supplierId,
        buyerId,
        dto.page ?? 1,
        dto.limit ?? 20,
      ),
    );
    return {
      items: result.items.map((item) => ClientFormatter.quotationRow(item)),
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }

  @Get(':buyerId/sample-requests')
  async getClientSampleRequests(
    @Req() req: SessionRequest,
    @Param('buyerId', new ParseUUIDPipe({ version: '4' })) buyerId: string,
  ) {
    const supplierId = await this.resolveSupplierId(req);
    return this.queryBus.execute<GetClientSampleRequestsQuery, StubResult>(
      new GetClientSampleRequestsQuery(supplierId, buyerId),
    );
  }

  @Get(':buyerId/chat-threads')
  async getClientChatThreads(
    @Req() req: SessionRequest,
    @Param('buyerId', new ParseUUIDPipe({ version: '4' })) buyerId: string,
  ) {
    const supplierId = await this.resolveSupplierId(req);
    return this.queryBus.execute<GetClientChatThreadsQuery, StubResult>(
      new GetClientChatThreadsQuery(supplierId, buyerId),
    );
  }

  @Get(':buyerId/notes')
  async getClientNotes(
    @Req() req: SessionRequest,
    @Param('buyerId', new ParseUUIDPipe({ version: '4' })) buyerId: string,
  ) {
    const supplierId = await this.resolveSupplierId(req);
    return this.queryBus.execute<GetClientNotesQuery, StubResult>(
      new GetClientNotesQuery(supplierId, buyerId),
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
