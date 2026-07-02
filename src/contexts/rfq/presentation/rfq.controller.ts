import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import type { FastifyRequest } from 'fastify';
import { SessionAuthGuard } from '../../../shared/infrastructure/guards/session-auth.guard';
import { IsFullyVerifiedSupplier } from '../../../shared/infrastructure/guards/is-fully-verified-supplier.guard';
import { AcceptQuotationCommand } from '../application/commands/accept-quotation.command';
import { CancelQuotationCommand } from '../application/commands/cancel-quotation.command';
import { CancelRfqCommand } from '../application/commands/cancel-rfq.command';
import { CreateGeneralCustomRfqCommand } from '../application/commands/create-general-custom-rfq.command';
import { CreateProductDirectedRfqCommand } from '../application/commands/create-product-directed-rfq.command';
import { MarkRfqViewedCommand } from '../application/commands/mark-rfq-viewed.command';
import {
  OpenRfqConversationAsBuyerCommand,
  OpenRfqConversationAsSupplierCommand,
} from '../application/commands/open-rfq-conversation.command';
import { RejectQuotationCommand } from '../application/commands/reject-quotation.command';
import { SubmitQuotationCommand } from '../application/commands/submit-quotation.command';
import { UpdateQuotationCommand } from '../application/commands/update-quotation.command';
import { UploadRfqAttachmentsCommand } from '../application/commands/upload-rfq-attachments.command';
import { GetRfqDetailQuery } from '../application/queries/get-rfq-detail.query';
import { ListAssignedRfqsQuery } from '../application/queries/list-assigned-rfqs.query';
import { ListBuyerRfqsQuery } from '../application/queries/list-buyer-rfqs.query';
import { ListMarketRfqsQuery } from '../application/queries/list-market-rfqs.query';
import { ListSupplierQuotationsQuery } from '../application/queries/list-supplier-quotations.query';
import { RfqFormatter } from './rfq.formatter';
import { CreateGeneralCustomRfqDto } from './dto/create-general-custom-rfq.dto';
import { CreateProductDirectedRfqDto } from './dto/create-product-directed-rfq.dto';
import { ListMarketRfqsQueryDto } from './dto/list-market-rfqs-query.dto';
import { ListBuyerRfqsQueryDto } from './dto/list-buyer-rfqs-query.dto';
import { ListSupplierQuotationsQueryDto } from './dto/list-supplier-quotations-query.dto';
import { SubmitQuotationDto } from './dto/submit-quotation.dto';
import { UpdateQuotationDto } from './dto/update-quotation.dto';
import {
  RFQ_ATTACHMENT_MAX_BYTES,
  RFQ_ATTACHMENT_MIME_TYPES,
} from './rfq-attachment.constraints';

type SessionRequest = FastifyRequest & {
  session: {
    user: {
      id: number;
      _id: string;
      email: string;
      role: string;
      verifiedAt: Date | null;
      viewAs?: 'buyer';
    };
  };
};

type MultipartFile = {
  toBuffer: () => Promise<Buffer>;
  filename: string;
  mimetype: string;
  file?: { bytesRead?: number };
};

@Controller('rfq')
@UseGuards(SessionAuthGuard)
export class RfqController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post('product')
  async createProductDirected(
    @Body() dto: CreateProductDirectedRfqDto,
    @Req() req: FastifyRequest,
  ): Promise<{ rfq: Record<string, unknown> }> {
    const buyerId = (req as SessionRequest).session.user.id;
    const result = (await this.commandBus.execute(
      new CreateProductDirectedRfqCommand(buyerId, dto.productId, {
        ...dto,
        attachments: [],
      }),
    )) as unknown as { rfq: Record<string, unknown> };

    return { rfq: RfqFormatter.rfq(result.rfq) };
  }

  @Post('general')
  async createGeneral(
    @Body() dto: CreateGeneralCustomRfqDto,
    @Req() req: FastifyRequest,
  ): Promise<{ rfq: Record<string, unknown> }> {
    const buyerId = (req as SessionRequest).session.user.id;
    const result = (await this.commandBus.execute(
      new CreateGeneralCustomRfqCommand(buyerId, { ...dto, attachments: [] }),
    )) as unknown as { rfq: Record<string, unknown> };

    return { rfq: RfqFormatter.rfq(result.rfq) };
  }

  @Get('me')
  async listBuyerRfqs(
    @Query() query: ListBuyerRfqsQueryDto,
    @Req() req: FastifyRequest,
  ): Promise<{ items: Record<string, unknown>[]; total: number }> {
    const buyerId = (req as SessionRequest).session.user.id;
    const result = (await this.queryBus.execute(
      new ListBuyerRfqsQuery(buyerId, query),
    )) as unknown as { items: Record<string, unknown>[]; total: number };
    return result;
  }

  @Get('market')
  @UseGuards(SessionAuthGuard, IsFullyVerifiedSupplier)
  async listMarket(
    @Query() query: ListMarketRfqsQueryDto,
    @Req() req: FastifyRequest,
  ): Promise<{ items: Record<string, unknown>[]; total: number }> {
    const userId = (req as SessionRequest).session.user.id;
    const result = (await this.queryBus.execute(
      new ListMarketRfqsQuery(userId, query),
    )) as unknown as { items: Record<string, unknown>[]; total: number };
    return result;
  }

  @Get('market/:rfqId')
  @UseGuards(SessionAuthGuard, IsFullyVerifiedSupplier)
  async getMarketRfq(
    @Param('rfqId') rfqId: string,
    @Req() req: FastifyRequest,
  ): Promise<{ rfq: Record<string, unknown> }> {
    const sessionUser = (req as SessionRequest).session.user;
    const rfq = (await this.queryBus.execute(
      new GetRfqDetailQuery(rfqId, sessionUser.id, sessionUser.role),
    )) as unknown as Record<string, unknown>;
    void this.commandBus.execute(
      new MarkRfqViewedCommand(rfqId, 'supplier', sessionUser.id),
    );
    return { rfq: RfqFormatter.rfq(rfq) };
  }

  @Get('assigned')
  @UseGuards(SessionAuthGuard, IsFullyVerifiedSupplier)
  async listAssigned(
    @Query() query: ListBuyerRfqsQueryDto,
    @Req() req: FastifyRequest,
  ): Promise<{ items: Record<string, unknown>[]; total: number }> {
    const userId = (req as SessionRequest).session.user.id;
    const result = (await this.queryBus.execute(
      new ListAssignedRfqsQuery(userId, query),
    )) as unknown as { items: Record<string, unknown>[]; total: number };
    return result;
  }

  @Get('quotations/me')
  @UseGuards(SessionAuthGuard, IsFullyVerifiedSupplier)
  async listMyQuotations(
    @Query() query: ListSupplierQuotationsQueryDto,
    @Req() req: FastifyRequest,
  ): Promise<{ items: Record<string, unknown>[]; total: number }> {
    const userId = (req as SessionRequest).session.user.id;
    const result = (await this.queryBus.execute(
      new ListSupplierQuotationsQuery(userId, query),
    )) as unknown as { items: Record<string, unknown>[]; total: number };
    return result;
  }

  @Post(':rfqId/quotations')
  @UseGuards(SessionAuthGuard, IsFullyVerifiedSupplier)
  async submitQuotation(
    @Param('rfqId') rfqId: string,
    @Body() dto: SubmitQuotationDto,
    @Req() req: FastifyRequest,
  ): Promise<{ quotation: Record<string, unknown> }> {
    const userId = (req as SessionRequest).session.user.id;
    const result = (await this.commandBus.execute(
      new SubmitQuotationCommand(rfqId, userId, dto),
    )) as unknown as { quotation: Record<string, unknown> };
    return { quotation: RfqFormatter.quotation(result.quotation) };
  }

  @Patch('quotations/:quotationId')
  @UseGuards(SessionAuthGuard, IsFullyVerifiedSupplier)
  async updateQuotation(
    @Param('quotationId') quotationId: string,
    @Body() dto: UpdateQuotationDto,
    @Req() req: FastifyRequest,
  ): Promise<{ quotation: Record<string, unknown> }> {
    const userId = (req as SessionRequest).session.user.id;
    const result = (await this.commandBus.execute(
      new UpdateQuotationCommand(quotationId, userId, dto),
    )) as unknown as { quotation: Record<string, unknown> };
    return { quotation: RfqFormatter.quotation(result.quotation) };
  }

  @Delete('quotations/:quotationId')
  @UseGuards(SessionAuthGuard, IsFullyVerifiedSupplier)
  async cancelQuotation(
    @Param('quotationId') quotationId: string,
    @Req() req: FastifyRequest,
  ): Promise<{ quotation: Record<string, unknown> }> {
    const userId = (req as SessionRequest).session.user.id;
    const result = (await this.commandBus.execute(
      new CancelQuotationCommand(quotationId, userId),
    )) as unknown as { quotation: Record<string, unknown> };
    return { quotation: RfqFormatter.quotation(result.quotation) };
  }

  @Get(':rfqId')
  async getDetail(
    @Param('rfqId') rfqId: string,
    @Req() req: FastifyRequest,
  ): Promise<{ rfq: Record<string, unknown> }> {
    const sessionUser = (req as SessionRequest).session.user;
    const effectiveRole =
      sessionUser.viewAs === 'buyer' ? 'buyer' : sessionUser.role;
    const rfq = (await this.queryBus.execute(
      new GetRfqDetailQuery(rfqId, sessionUser.id, effectiveRole),
    )) as unknown as Record<string, unknown>;
    const viewerRole = effectiveRole === 'supplier' ? 'supplier' : 'buyer';
    void this.commandBus.execute(
      new MarkRfqViewedCommand(rfqId, viewerRole, sessionUser.id),
    );
    return { rfq: RfqFormatter.rfq(rfq) };
  }

  @Post(':rfqId/quotations/:quotationId/accept')
  async acceptQuotation(
    @Param('rfqId') rfqId: string,
    @Param('quotationId') quotationId: string,
    @Req() req: FastifyRequest,
  ): Promise<{
    rfq: Record<string, unknown>;
    quotation: Record<string, unknown> | null;
    order: Record<string, unknown>;
  }> {
    const buyerId = (req as SessionRequest).session.user.id;
    const result = (await this.commandBus.execute(
      new AcceptQuotationCommand(rfqId, quotationId, buyerId),
    )) as unknown as {
      rfq: Record<string, unknown>;
      quotation: Record<string, unknown> | null;
      order: Record<string, unknown>;
    };

    return {
      rfq: RfqFormatter.rfq(result.rfq),
      quotation: result.quotation
        ? RfqFormatter.quotation(result.quotation)
        : null,
      order: RfqFormatter.order(result.order),
    };
  }

  @Post(':rfqId/quotations/:quotationId/reject')
  async rejectQuotation(
    @Param('rfqId') rfqId: string,
    @Param('quotationId') quotationId: string,
    @Req() req: FastifyRequest,
  ): Promise<{ quotation: Record<string, unknown> }> {
    const buyerId = (req as SessionRequest).session.user.id;
    const result = (await this.commandBus.execute(
      new RejectQuotationCommand(rfqId, quotationId, buyerId),
    )) as unknown as { quotation: Record<string, unknown> };
    return { quotation: RfqFormatter.quotation(result.quotation) };
  }

  @Post(':rfqId/suppliers/:supplierId/conversation')
  async openConversationAsBuyer(
    @Param('rfqId') rfqId: string,
    @Param('supplierId') supplierId: string,
    @Req() req: FastifyRequest,
  ): Promise<{ conversationId: string }> {
    const buyerUserId = (req as SessionRequest).session.user.id;
    return this.commandBus.execute(
      new OpenRfqConversationAsBuyerCommand(rfqId, supplierId, buyerUserId),
    );
  }

  @Post(':rfqId/conversation')
  @UseGuards(SessionAuthGuard, IsFullyVerifiedSupplier)
  async openConversationAsSupplier(
    @Param('rfqId') rfqId: string,
    @Req() req: FastifyRequest,
  ): Promise<{ conversationId: string }> {
    const supplierUserId = (req as SessionRequest).session.user.id;
    return this.commandBus.execute(
      new OpenRfqConversationAsSupplierCommand(rfqId, supplierUserId),
    );
  }

  @Patch(':rfqId/cancel')
  async cancelRfq(
    @Param('rfqId') rfqId: string,
    @Req() req: FastifyRequest,
  ): Promise<{ rfq: Record<string, unknown> }> {
    const buyerId = (req as SessionRequest).session.user.id;
    const result = (await this.commandBus.execute(
      new CancelRfqCommand(rfqId, buyerId),
    )) as unknown as { rfq: Record<string, unknown> };
    return { rfq: RfqFormatter.rfq(result.rfq) };
  }

  @Post(':rfqId/attachments')
  async uploadAttachments(
    @Param('rfqId') rfqId: string,
    @Req() req: FastifyRequest,
  ): Promise<{ rfq: Record<string, unknown> }> {
    const buyerId = (req as SessionRequest).session.user.id;

    const body = req.body as Record<string, unknown>;
    const raw = body.attachments;
    const parts: MultipartFile[] = Array.isArray(raw)
      ? (raw as MultipartFile[])
      : raw
        ? [raw as MultipartFile]
        : [];

    const attachments: Array<{
      buffer: Buffer;
      originalName: string;
      mimeType: string;
    }> = [];

    for (const part of parts) {
      if (!part?.toBuffer) continue;

      if (!RFQ_ATTACHMENT_MIME_TYPES.includes(part.mimetype)) {
        throw new BadRequestException(
          `Unsupported file type: ${part.mimetype}`,
        );
      }

      const buffer = await part.toBuffer();

      if (buffer.length > RFQ_ATTACHMENT_MAX_BYTES) {
        throw new BadRequestException('File exceeds 10 MB limit.');
      }

      attachments.push({
        buffer,
        originalName: part.filename,
        mimeType: part.mimetype,
      });
    }

    if (attachments.length === 0) {
      throw new BadRequestException('No valid attachment files provided.');
    }

    const rfq = (await this.commandBus.execute(
      new UploadRfqAttachmentsCommand(rfqId, buyerId, attachments),
    )) as unknown as Record<string, unknown>;

    return { rfq: RfqFormatter.rfq(rfq) };
  }
}
