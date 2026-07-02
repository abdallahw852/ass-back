import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import type { FastifyRequest } from 'fastify';
import { SessionAuthGuard } from '../../../shared/infrastructure/guards/session-auth.guard';
import { BuyerGuard } from '../../../shared/infrastructure/guards/buyer.guard';
import { StorageService } from '../../../shared/infrastructure/services/storage.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { UpdateSupplierGroupDto } from './dto/update-supplier-group.dto';
import { MergeCartDto } from './dto/merge-cart.dto';
import { AddToCartCommand } from '../application/commands/add-to-cart.command';
import { UpdateCartItemCommand } from '../application/commands/update-cart-item.command';
import { RemoveCartItemCommand } from '../application/commands/remove-cart-item.command';
import { ClearCartCommand } from '../application/commands/clear-cart.command';
import { UpdateSupplierGroupCommand } from '../application/commands/update-supplier-group.command';
import { UploadSupplierAttachmentCommand } from '../application/commands/upload-supplier-attachment.command';
import { RemoveSupplierAttachmentCommand } from '../application/commands/remove-supplier-attachment.command';
import { MergeGuestCartCommand } from '../application/commands/merge-guest-cart.command';
import { GetCartQuery } from '../application/queries/get-cart.query';
import { CartFormatter } from './cart.formatter';

type SessionRequest = FastifyRequest & {
  session: { user: { id: number; verifiedAt: Date | null } };
};

type MultipartFile = {
  toBuffer: () => Promise<Buffer>;
  filename: string;
  mimetype: string;
  file?: { bytesRead?: number };
};

@Controller('cart')
@UseGuards(SessionAuthGuard, BuyerGuard)
export class CartController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly storageService: StorageService,
  ) {}

  @Get()
  async getCart(@Req() req: FastifyRequest): Promise<Record<string, unknown>> {
    const buyerId = (req as SessionRequest).session.user.id;
    const result = (await this.queryBus.execute(
      new GetCartQuery(buyerId),
    )) as unknown as Record<string, unknown>;
    return CartFormatter.cart(result, this.storageService);
  }

  @Post('items')
  async addItem(
    @Body() dto: AddToCartDto,
    @Req() req: FastifyRequest,
  ): Promise<Record<string, unknown>> {
    const buyerId = (req as SessionRequest).session.user.id;
    await this.commandBus.execute(
      new AddToCartCommand(
        buyerId,
        dto.productId,
        dto.quantity,
        dto.variantId,
        dto.targetPrice,
        dto.notes,
      ),
    );
    const result = (await this.queryBus.execute(
      new GetCartQuery(buyerId),
    )) as unknown as Record<string, unknown>;
    return CartFormatter.cart(result, this.storageService);
  }

  @Patch('items/:itemId')
  async updateItem(
    @Param('itemId') itemId: string,
    @Body() dto: UpdateCartItemDto,
    @Req() req: FastifyRequest,
  ): Promise<Record<string, unknown>> {
    const buyerId = (req as SessionRequest).session.user.id;
    await this.commandBus.execute(
      new UpdateCartItemCommand(
        buyerId,
        itemId,
        dto.quantity,
        dto.targetPrice,
        dto.notes,
      ),
    );
    const result = (await this.queryBus.execute(
      new GetCartQuery(buyerId),
    )) as unknown as Record<string, unknown>;
    return CartFormatter.cart(result, this.storageService);
  }

  @Delete('items/:itemId')
  async removeItem(
    @Param('itemId') itemId: string,
    @Req() req: FastifyRequest,
  ): Promise<{ removed: boolean }> {
    const buyerId = (req as SessionRequest).session.user.id;
    return (await this.commandBus.execute(
      new RemoveCartItemCommand(buyerId, itemId),
    )) as unknown as { removed: boolean };
  }

  @Delete()
  async clearCart(@Req() req: FastifyRequest): Promise<{ cleared: boolean }> {
    const buyerId = (req as SessionRequest).session.user.id;
    return (await this.commandBus.execute(
      new ClearCartCommand(buyerId),
    )) as unknown as { cleared: boolean };
  }

  @Patch('suppliers/:supplierId')
  async updateSupplierGroup(
    @Param('supplierId') supplierIdStr: string,
    @Body() dto: UpdateSupplierGroupDto,
    @Req() req: FastifyRequest,
  ): Promise<Record<string, unknown>> {
    const buyerId = (req as SessionRequest).session.user.id;
    const supplierId = Number(supplierIdStr);
    return (await this.commandBus.execute(
      new UpdateSupplierGroupCommand(
        buyerId,
        supplierId,
        dto.message,
        dto.shippingDestination,
        dto.shippingMethod,
        dto.selectedShippingOption,
      ),
    )) as unknown as Record<string, unknown>;
  }

  @Post('suppliers/:supplierId/attachments')
  async addSupplierAttachment(
    @Param('supplierId') supplierIdStr: string,
    @Req() req: FastifyRequest,
  ): Promise<Record<string, unknown>> {
    const buyerId = (req as SessionRequest).session.user.id;
    const supplierId = Number(supplierIdStr);
    const attachment = await this.extractSingleAttachment(req);
    return (await this.commandBus.execute(
      new UploadSupplierAttachmentCommand(buyerId, supplierId, attachment),
    )) as unknown as Record<string, unknown>;
  }

  @Delete('suppliers/:supplierId/attachments/:attachmentId')
  async removeSupplierAttachment(
    @Param('supplierId') supplierIdStr: string,
    @Param('attachmentId') attachmentId: string,
    @Req() req: FastifyRequest,
  ): Promise<{ removed: boolean }> {
    const buyerId = (req as SessionRequest).session.user.id;
    const supplierId = Number(supplierIdStr);
    return (await this.commandBus.execute(
      new RemoveSupplierAttachmentCommand(buyerId, supplierId, attachmentId),
    )) as unknown as { removed: boolean };
  }

  @Post('merge')
  async mergeGuestCart(
    @Body() dto: MergeCartDto,
    @Req() req: FastifyRequest,
  ): Promise<{ mergedCount: number }> {
    const buyerId = (req as SessionRequest).session.user.id;
    return (await this.commandBus.execute(
      new MergeGuestCartCommand(buyerId, dto.items),
    )) as unknown as { mergedCount: number };
  }

  private async extractSingleAttachment(req: FastifyRequest): Promise<{
    url: string;
    originalName: string;
    mimeType: string;
    size: number;
  }> {
    const body = req.body as Record<string, unknown>;
    const raw = body.file ?? body.attachment;
    const part = raw as MultipartFile | undefined;

    if (!part?.toBuffer) {
      throw new Error('No file provided.');
    }

    const buffer = await part.toBuffer();
    const url = await this.storageService.storeFile({
      buffer,
      originalName: part.filename,
      mimeType: part.mimetype,
      destinationDir: 'uploads/cart',
    });

    return {
      url,
      originalName: part.filename,
      mimeType: part.mimetype,
      size: part.file?.bytesRead ?? buffer.length,
    };
  }
}
