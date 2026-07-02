import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import type { FastifyRequest } from 'fastify';
import { SessionAuthGuard } from '../../../shared/infrastructure/guards/session-auth.guard';
import { IsFullyVerifiedSupplier } from '../../../shared/infrastructure/guards/is-fully-verified-supplier.guard';
import { StorageService } from '../../../shared/infrastructure/services/storage.service';
import type { ISupplierRepository } from '../../supplier/identity/domain/repositories/supplier.repository.interface';
import { SUPPLIER_REPOSITORY } from '../../supplier/identity/domain/repositories/supplier.repository.interface';

// ── Commands ──────────────────────────────────────────────────
import { CreateProductCommand } from '../application/commands/create-product.command';
import { UpdateProductCommand } from '../application/commands/update-product.command';
import { DeleteProductCommand } from '../application/commands/delete-product.command';
import { UpdateProductStatusCommand } from '../application/commands/update-product-status.command';
import { SubmitProductForApprovalCommand } from '../application/commands/submit-product-for-approval.command';
import { UploadProductImagesCommand } from '../application/commands/upload-product-images.command';
import { AddVariantCommand } from '../application/commands/add-variant.command';
import { UpdateVariantCommand } from '../application/commands/update-variant.command';
import { RemoveVariantCommand } from '../application/commands/remove-variant.command';
import { AddBundleItemCommand } from '../application/commands/add-bundle-item.command';
import { RemoveBundleItemCommand } from '../application/commands/remove-bundle-item.command';

// ── Queries ───────────────────────────────────────────────────
import { GetProductQuery } from '../application/queries/get-product.query';
import { ListProductsQuery } from '../application/queries/list-products.query';
import { GetProductVariantsQuery } from '../application/queries/get-product-variants.query';

// ── DTOs ──────────────────────────────────────────────────────
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateProductStatusDto } from './dto/update-product-status.dto';
import { AddVariantDto } from './dto/add-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';
import { AddBundleItemDto } from './dto/add-bundle-item.dto';
import { ListProductsQueryDto } from './dto/list-products-query.dto';
import { SetPricingTiersDto } from './dto/set-pricing-tiers.dto';
import { SetPricingTiersCommand } from '../application/commands/set-pricing-tiers.command';
import { ProductFormatter } from './product.formatter';

type MultipartFile = {
  toBuffer: () => Promise<Buffer>;
  filename: string;
  mimetype: string;
};

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

type ProductResult = { product: Record<string, unknown> };
type VariantResult = { variant: Record<string, unknown> };
type BundleItemResult = { bundleItem: Record<string, unknown> };
type DeletedResult = { deleted: boolean };
type ListResult = {
  items: Record<string, unknown>[];
  total: number;
  page: number;
  limit: number;
};

@Controller('products')
export class ProductController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly storageService: StorageService,
    @Inject(SUPPLIER_REPOSITORY)
    private readonly supplierRepository: ISupplierRepository,
  ) {}

  // ── Helpers ─────────────────────────────────────────────────

  private async resolveSupplierId(req: FastifyRequest): Promise<number> {
    const userId = (req as SessionRequest).session.user.id;
    const supplier = await this.supplierRepository.findByUserId(userId);
    if (!supplier) {
      throw new BadRequestException('No supplier profile found for this user.');
    }
    return supplier.id;
  }

  // ── Product CRUD ────────────────────────────────────────────

  @Post()
  @UseGuards(SessionAuthGuard, IsFullyVerifiedSupplier)
  async create(
    @Body() dto: CreateProductDto,
    @Req() req: FastifyRequest,
  ): Promise<ProductResult> {
    const supplierId = await this.resolveSupplierId(req);
    const imageUrls = await this.extractImages(req);

    let digitalFileUrl: string | undefined;
    const body = req.body as Record<string, unknown>;
    const digitalFile = body.digitalFile as MultipartFile | undefined;
    if (digitalFile?.toBuffer) {
      const buffer = await digitalFile.toBuffer();
      digitalFileUrl = await this.storageService.storeFile({
        buffer,
        originalName: digitalFile.filename,
        mimeType: digitalFile.mimetype,
        destinationDir: 'uploads/products/digital',
      });
    }

    const result = (await this.commandBus.execute(
      new CreateProductCommand(supplierId, {
        ...dto,
        images: imageUrls.length > 0 ? imageUrls : undefined,
        discountEndDate: dto.discountEndDate
          ? new Date(dto.discountEndDate)
          : undefined,
        bookingAvailableDate: dto.bookingAvailableDate
          ? new Date(dto.bookingAvailableDate)
          : undefined,
        digitalFileUrl,
      }),
    )) as unknown as ProductResult;

    return {
      product: await ProductFormatter.product(
        result.product,
        this.storageService,
      ),
    };
  }

  @Patch(':productId')
  @UseGuards(SessionAuthGuard, IsFullyVerifiedSupplier)
  async update(
    @Param('productId') productId: string,
    @Body() dto: UpdateProductDto,
    @Req() req: FastifyRequest,
  ): Promise<ProductResult> {
    const supplierId = await this.resolveSupplierId(req);
    const imageUrls = await this.extractImages(req);

    let digitalFileUrl: string | undefined;
    const body = req.body as Record<string, unknown>;
    const digitalFile = body.digitalFile as MultipartFile | undefined;
    if (digitalFile?.toBuffer) {
      const buffer = await digitalFile.toBuffer();
      digitalFileUrl = await this.storageService.storeFile({
        buffer,
        originalName: digitalFile.filename,
        mimeType: digitalFile.mimetype,
        destinationDir: 'uploads/products/digital',
      });
    }

    const result = (await this.commandBus.execute(
      new UpdateProductCommand(productId, supplierId, {
        ...dto,
        images: imageUrls.length > 0 ? imageUrls : undefined,
        discountEndDate: dto.discountEndDate
          ? new Date(dto.discountEndDate)
          : undefined,
        bookingAvailableDate: dto.bookingAvailableDate
          ? new Date(dto.bookingAvailableDate)
          : undefined,
        digitalFileUrl,
      }),
    )) as unknown as ProductResult;

    return {
      product: await ProductFormatter.product(
        result.product,
        this.storageService,
      ),
    };
  }

  @Delete(':productId')
  @UseGuards(SessionAuthGuard, IsFullyVerifiedSupplier)
  async delete(
    @Param('productId') productId: string,
    @Req() req: FastifyRequest,
  ): Promise<DeletedResult> {
    const supplierId = await this.resolveSupplierId(req);
    return (await this.commandBus.execute(
      new DeleteProductCommand(productId, supplierId),
    )) as unknown as DeletedResult;
  }

  @Patch(':productId/status')
  @UseGuards(SessionAuthGuard, IsFullyVerifiedSupplier)
  async updateStatus(
    @Param('productId') productId: string,
    @Body() dto: UpdateProductStatusDto,
    @Req() req: FastifyRequest,
  ): Promise<ProductResult> {
    const supplierId = await this.resolveSupplierId(req);
    const result = (await this.commandBus.execute(
      new UpdateProductStatusCommand(productId, supplierId, dto.status),
    )) as unknown as ProductResult;
    return {
      product: await ProductFormatter.product(
        result.product,
        this.storageService,
      ),
    };
  }

  @Patch(':productId/submit')
  @UseGuards(SessionAuthGuard, IsFullyVerifiedSupplier)
  async submitForApproval(
    @Param('productId') productId: string,
    @Req() req: FastifyRequest,
  ): Promise<ProductResult> {
    const supplierId = await this.resolveSupplierId(req);
    const result = (await this.commandBus.execute(
      new SubmitProductForApprovalCommand(productId, supplierId),
    )) as unknown as ProductResult;
    return {
      product: await ProductFormatter.product(
        result.product,
        this.storageService,
      ),
    };
  }

  // ── Pricing tiers ───────────────────────────────────────────

  @Put(':productId/pricing-tiers')
  @UseGuards(SessionAuthGuard, IsFullyVerifiedSupplier)
  async setPricingTiers(
    @Param('productId') productId: string,
    @Body() dto: SetPricingTiersDto,
    @Req() req: FastifyRequest,
  ): Promise<Record<string, unknown>> {
    const supplierId = await this.resolveSupplierId(req);
    const tiers = dto.tiers.map((t) => ({
      minQuantity: t.minQuantity,
      maxQuantity: t.maxQuantity ?? null,
      unitPrice: t.unitPrice,
    }));
    return this.commandBus.execute(
      new SetPricingTiersCommand(productId, supplierId, tiers),
    );
  }

  // ── Product images ──────────────────────────────────────────

  @Patch(':productId/images')
  @UseGuards(SessionAuthGuard, IsFullyVerifiedSupplier)
  async uploadImages(
    @Param('productId') productId: string,
    @Req() req: FastifyRequest,
  ): Promise<ProductResult> {
    const supplierId = await this.resolveSupplierId(req);
    const imageUrls = await this.extractImages(req);

    if (imageUrls.length === 0) {
      throw new BadRequestException('At least one image file is required.');
    }

    const result = (await this.commandBus.execute(
      new UploadProductImagesCommand(productId, supplierId, imageUrls),
    )) as unknown as ProductResult;

    return {
      product: await ProductFormatter.product(
        result.product,
        this.storageService,
      ),
    };
  }

  // ── Product queries ─────────────────────────────────────────

  @Get()
  @UseGuards(SessionAuthGuard)
  async list(
    @Query() query: ListProductsQueryDto,
    @Req() req: FastifyRequest,
  ): Promise<Record<string, unknown>> {
    const supplierId = await this.resolveSupplierId(req);
    const result = (await this.queryBus.execute(
      new ListProductsQuery(supplierId, query),
    )) as unknown as ListResult;
    return await ProductFormatter.list(result, this.storageService);
  }

  @Get(':productId')
  @UseGuards(SessionAuthGuard)
  async getOne(
    @Param('productId') productId: string,
    @Req() req: FastifyRequest,
  ): Promise<ProductResult> {
    const supplierId = await this.resolveSupplierId(req);
    const product = (await this.queryBus.execute(
      new GetProductQuery(productId, supplierId),
    )) as unknown as Record<string, unknown>;
    return {
      product: await ProductFormatter.product(product, this.storageService),
    };
  }

  // ── Variants ────────────────────────────────────────────────

  @Get(':productId/variants')
  @UseGuards(SessionAuthGuard)
  async getVariants(
    @Param('productId') productId: string,
    @Req() req: FastifyRequest,
  ): Promise<{ variants: Record<string, unknown>[] }> {
    const supplierId = await this.resolveSupplierId(req);
    const variants = (await this.queryBus.execute(
      new GetProductVariantsQuery(productId, supplierId),
    )) as unknown as Record<string, unknown>[];
    return { variants: variants.map((v) => ProductFormatter.variant(v)) };
  }

  @Post(':productId/variants')
  @UseGuards(SessionAuthGuard, IsFullyVerifiedSupplier)
  async addVariant(
    @Param('productId') productId: string,
    @Body() dto: AddVariantDto,
    @Req() req: FastifyRequest,
  ): Promise<VariantResult> {
    const supplierId = await this.resolveSupplierId(req);
    const result = (await this.commandBus.execute(
      new AddVariantCommand(productId, supplierId, dto),
    )) as unknown as VariantResult;
    return { variant: ProductFormatter.variant(result.variant) };
  }

  @Patch('variants/:variantId')
  @UseGuards(SessionAuthGuard, IsFullyVerifiedSupplier)
  async updateVariant(
    @Param('variantId') variantId: string,
    @Body() dto: UpdateVariantDto,
    @Req() req: FastifyRequest,
  ): Promise<VariantResult> {
    const supplierId = await this.resolveSupplierId(req);
    const result = (await this.commandBus.execute(
      new UpdateVariantCommand(variantId, supplierId, dto),
    )) as unknown as VariantResult;
    return { variant: ProductFormatter.variant(result.variant) };
  }

  @Delete('variants/:variantId')
  @UseGuards(SessionAuthGuard, IsFullyVerifiedSupplier)
  async removeVariant(
    @Param('variantId') variantId: string,
    @Req() req: FastifyRequest,
  ): Promise<DeletedResult> {
    const supplierId = await this.resolveSupplierId(req);
    return (await this.commandBus.execute(
      new RemoveVariantCommand(variantId, supplierId),
    )) as unknown as DeletedResult;
  }

  // ── Bundle items ────────────────────────────────────────────

  @Post(':productId/bundle-items')
  @UseGuards(SessionAuthGuard, IsFullyVerifiedSupplier)
  async addBundleItem(
    @Param('productId') productId: string,
    @Body() dto: AddBundleItemDto,
    @Req() req: FastifyRequest,
  ): Promise<BundleItemResult> {
    const supplierId = await this.resolveSupplierId(req);
    const result = (await this.commandBus.execute(
      new AddBundleItemCommand(productId, supplierId, dto.childProductId),
    )) as unknown as BundleItemResult;
    return { bundleItem: ProductFormatter.bundleItem(result.bundleItem) };
  }

  @Delete(':productId/bundle-items/:childProductId')
  @UseGuards(SessionAuthGuard, IsFullyVerifiedSupplier)
  async removeBundleItem(
    @Param('productId') productId: string,
    @Param('childProductId') childProductId: string,
    @Req() req: FastifyRequest,
  ): Promise<DeletedResult> {
    const supplierId = await this.resolveSupplierId(req);
    return (await this.commandBus.execute(
      new RemoveBundleItemCommand(productId, supplierId, childProductId),
    )) as unknown as DeletedResult;
  }

  // ── Private helpers ─────────────────────────────────────────

  private async extractImages(req: FastifyRequest): Promise<string[]> {
    const body = req.body as Record<string, unknown>;
    const raw = body.images;
    const parts: MultipartFile[] = Array.isArray(raw)
      ? (raw as MultipartFile[])
      : raw
        ? [raw as MultipartFile]
        : [];

    const urls: string[] = [];
    for (const part of parts) {
      if (part?.toBuffer) {
        const buffer = await part.toBuffer();
        const url = await this.storageService.storeFile({
          buffer,
          originalName: part.filename,
          mimeType: part.mimetype,
          destinationDir: 'uploads/products',
        });
        urls.push(url);
      }
    }
    return urls;
  }
}
