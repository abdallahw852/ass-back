import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SessionAuthGuard } from '../../../shared/infrastructure/guards/session-auth.guard';
import { AdminGuard } from '../../../shared/guards/admin.guard';
import { IdempotencyGuard } from '../../../shared/idempotency/idempotency.guard';
import { CheckoutCartDto } from './dto/checkout-cart.dto';
import { CheckoutCartCommand } from '../application/commands/checkout-cart.command';
import type { IOrderDraftRepository } from '../domain/order-draft.repository.interface';
import { ORDER_DRAFT_REPOSITORY } from '../domain/order-draft.repository.interface';
import type { ITradeOrderRepository } from '../domain/order.repository.interface';
import { TRADE_ORDER_REPOSITORY } from '../domain/order.repository.interface';
import { CheckoutOrderDraftCommand } from '../application/commands/checkout-order-draft.command';
import { MarkOrderShippedCommand } from '../application/commands/mark-order-shipped.command';
import { MarkOrderDeliveredCommand } from '../application/commands/mark-order-delivered.command';
import { ConfirmOrderReceiptCommand } from '../application/commands/confirm-order-receipt.command';
import { ReleaseOrderCommand } from '../application/commands/release-order.command';
import { RefundOrderCommand } from '../application/commands/refund-order.command';
import { OpenDisputeCommand } from '../application/commands/open-dispute.command';
import { ListOrdersQuery } from '../application/queries/list-orders.query';
import { GetOrderQuery } from '../application/queries/get-order.query';
import { ListAuditEventsQuery } from '../../audit-log/application/queries/list-audit-events.query';

export class MarkShippedDto {
  @IsString() @IsNotEmpty() carrier: string;
  @IsString() @IsNotEmpty() trackingNumber: string;
  @IsOptional() @IsString() trackingUrl?: string;
}

export class OpenDisputeDto {
  @IsString() @IsNotEmpty() reason: string;
}

export class RefundOrderDto {
  @IsNumber() @Min(0.01) @Type(() => Number) amount: number;
  @IsString() @IsNotEmpty() reason: string;
}

export class ReleaseOrderDto {
  @IsString() @IsNotEmpty() reason: string;
}

export class ResolveDisputeDto {
  @IsString() @IsNotEmpty() outcome: 'buyer' | 'supplier';
  @IsString() @IsNotEmpty() note: string;
  @IsNumber() @IsOptional() @Type(() => Number) refundAmount?: number;
}

interface AuthenticatedRequest {
  session: { user: { id: number; role: string } };
}

@Controller('orders')
@UseGuards(SessionAuthGuard)
export class OrderController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    @Inject(ORDER_DRAFT_REPOSITORY)
    private readonly orderDraftRepo: IOrderDraftRepository,
    @Inject(TRADE_ORDER_REPOSITORY)
    private readonly tradeOrderRepo: ITradeOrderRepository,
  ) {}

  @Post('checkout')
  async checkout(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CheckoutCartDto,
  ): Promise<any> {
    return this.commandBus.execute(
      new CheckoutCartCommand(req.session.user.id, dto.itemIds || []),
    );
  }

  @Post('drafts/:draftId/checkout')
  async checkoutDraft(
    @Request() req: AuthenticatedRequest,
    @Param('draftId') draftId: string,
  ): Promise<any> {
    return this.commandBus.execute(
      new CheckoutOrderDraftCommand(draftId, req.session.user.id),
    );
  }

  @Get()
  async listOrders(@Request() req: AuthenticatedRequest): Promise<any> {
    return this.queryBus.execute(new ListOrdersQuery(req.session.user.id));
  }

  @Get('rfq-pending-payment')
  async getRfqPendingPayment(
    @Request() req: AuthenticatedRequest,
    @Query('rfqId') rfqId: string,
  ): Promise<{
    id: string;
    clientSecret: string | null;
    subtotal: number;
    currency: string;
  } | null> {
    if (!rfqId) return null;
    return this.tradeOrderRepo.findPendingPaymentByRfqAndBuyer(
      rfqId,
      req.session.user.id,
    );
  }

  @Get('rfq-status')
  async getRfqStatus(
    @Query('rfqId') rfqId: string,
  ): Promise<{ tradeOrderStatus: string | null }> {
    if (!rfqId) return { tradeOrderStatus: null };
    const status = await this.tradeOrderRepo.findStatusByRfqId(rfqId);
    return { tradeOrderStatus: status };
  }

  @Get('drafts/pending')
  async getPendingDraft(
    @Request() req: AuthenticatedRequest,
    @Query('rfqId') rfqId: string,
  ): Promise<{
    id: string;
    subtotal: number;
    currency: string;
    status: string;
  } | null> {
    if (!rfqId) return null;
    const draft = await this.orderDraftRepo.findPendingByRfqAndBuyer(
      rfqId,
      req.session.user.id,
    );
    if (!draft) return null;
    return {
      id: draft._id,
      subtotal: Number(draft.subtotal),
      currency: draft.currency,
      status: draft.status,
    };
  }

  @Get(':orderId')
  async getOrder(
    @Request() req: AuthenticatedRequest,
    @Param('orderId') orderId: string,
  ): Promise<any> {
    return this.queryBus.execute(
      new GetOrderQuery(orderId, req.session.user.id),
    );
  }

  @Post(':orderId/ship')
  async markShipped(
    @Request() req: AuthenticatedRequest,
    @Param('orderId') orderId: string,
    @Body() dto: MarkShippedDto,
  ): Promise<void> {
    await this.commandBus.execute(
      new MarkOrderShippedCommand(
        orderId,
        req.session.user.id,
        dto.carrier,
        dto.trackingNumber,
        dto.trackingUrl ?? null,
      ),
    );
  }

  @Post(':orderId/deliver')
  async markDelivered(
    @Request() req: AuthenticatedRequest,
    @Param('orderId') orderId: string,
  ): Promise<void> {
    await this.commandBus.execute(
      new MarkOrderDeliveredCommand(orderId, req.session.user.id),
    );
  }

  @Post(':orderId/confirm-receipt')
  @UseGuards(IdempotencyGuard)
  async confirmReceipt(
    @Request() req: AuthenticatedRequest,
    @Param('orderId') orderId: string,
  ): Promise<void> {
    await this.commandBus.execute(
      new ConfirmOrderReceiptCommand(orderId, req.session.user.id),
    );
  }

  @Post(':orderId/disputes')
  async openDispute(
    @Request() req: AuthenticatedRequest,
    @Param('orderId') orderId: string,
    @Body() dto: OpenDisputeDto,
  ): Promise<void> {
    await this.commandBus.execute(
      new OpenDisputeCommand(orderId, req.session.user.id, dto.reason),
    );
  }

  @Post(':orderId/refunds')
  @UseGuards(AdminGuard, IdempotencyGuard)
  async refundOrder(
    @Request() req: AuthenticatedRequest,
    @Param('orderId') orderId: string,
    @Body() dto: RefundOrderDto,
  ): Promise<void> {
    await this.commandBus.execute(
      new RefundOrderCommand(
        orderId,
        req.session.user.id,
        dto.amount,
        dto.reason,
      ),
    );
  }

  @Post(':orderId/release')
  @UseGuards(AdminGuard)
  async releaseOrder(
    @Request() req: AuthenticatedRequest,
    @Param('orderId') orderId: string,
    @Body() _dto: ReleaseOrderDto,
  ): Promise<void> {
    await this.commandBus.execute(
      new ReleaseOrderCommand(orderId, req.session.user.id, 'admin_override'),
    );
  }

  @Get(':orderId/audit-log')
  @UseGuards(AdminGuard)
  async getAuditLog(
    @Param('orderId') orderId: string,
    @Query('limit') limit = 50,
    @Query('offset') offset = 0,
  ): Promise<any> {
    return this.queryBus.execute(
      new ListAuditEventsQuery('order', orderId, Number(limit), Number(offset)),
    );
  }
}
