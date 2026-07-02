import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import type { FastifyRequest } from 'fastify';
import { AdminGuard } from '../../../shared/guards/admin.guard';
import { AllowUnverified } from '../../../shared/decorators/allow-unverified.decorator';
import { StorageService } from '../../../shared/infrastructure/services/storage.service';

import { CreateCategoryCommand } from '../application/commands/create-category.command';
import { UpdateCategoryCommand } from '../application/commands/update-category.command';
import { DeleteCategoryCommand } from '../application/commands/delete-category.command';
import { GetCategoryTreeQuery } from '../application/queries/get-category-tree.query';
import { GetCategoryQuery } from '../application/queries/get-category.query';
import { GetCategoryChildrenQuery } from '../application/queries/get-category-children.query';

import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryFormatter } from './category.formatter';

type MultipartFile = {
  toBuffer: () => Promise<Buffer>;
  filename: string;
  mimetype: string;
};

@Controller('categories')
export class CategoryController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly storageService: StorageService,
  ) {}

  // ── Public reads (no auth required) ─────────────────────────

  @AllowUnverified()
  @Get()
  async getTree(): Promise<Record<string, unknown>> {
    const result = (await this.queryBus.execute(
      new GetCategoryTreeQuery(),
    )) as unknown as { categories: Record<string, unknown>[] };
    return await CategoryFormatter.tree(result, this.storageService);
  }

  @AllowUnverified()
  @Get(':slugOrId')
  async getOne(
    @Param('slugOrId') slugOrId: string,
  ): Promise<{ category: Record<string, unknown> }> {
    const result = (await this.queryBus.execute(
      new GetCategoryQuery(slugOrId),
    )) as unknown as { category: Record<string, unknown> };
    return {
      category: await CategoryFormatter.category(
        result.category,
        this.storageService,
      ),
    };
  }

  @AllowUnverified()
  @Get(':slugOrId/children')
  async getChildren(@Param('slugOrId') slugOrId: string): Promise<{
    category: Record<string, unknown>;
    children: Record<string, unknown>[];
  }> {
    const result = (await this.queryBus.execute(
      new GetCategoryChildrenQuery(slugOrId),
    )) as unknown as {
      category: Record<string, unknown>;
      children: Record<string, unknown>[];
    };
    return {
      category: await CategoryFormatter.category(
        result.category,
        this.storageService,
      ),
      children: await Promise.all(
        result.children.map((c) =>
          CategoryFormatter.category(c, this.storageService),
        ),
      ),
    };
  }

  // ── Admin writes ─────────────────────────────────────────────

  @Post()
  @UseGuards(AdminGuard)
  async create(
    @Body() dto: CreateCategoryDto,
    @Req() req: FastifyRequest,
  ): Promise<Record<string, unknown>> {
    const { imageUrl, iconUrl } = await this.extractCategoryFiles(req);

    const result = (await this.commandBus.execute(
      new CreateCategoryCommand(
        dto.name,
        dto.slug,
        dto.nameAr,
        dto.parentId,
        imageUrl,
        iconUrl,
        dto.description,
        dto.sortOrder,
        dto.level,
      ),
    )) as unknown as { category: Record<string, unknown> };
    return {
      category: await CategoryFormatter.category(
        result.category,
        this.storageService,
      ),
    };
  }

  @Patch(':categoryId')
  @UseGuards(AdminGuard)
  async update(
    @Param('categoryId') categoryId: string,
    @Body() dto: UpdateCategoryDto,
    @Req() req: FastifyRequest,
  ): Promise<{ category: Record<string, unknown> }> {
    const { imageUrl, iconUrl } = await this.extractCategoryFiles(req);

    const result = (await this.commandBus.execute(
      new UpdateCategoryCommand(
        categoryId,
        dto.name,
        dto.nameAr,
        dto.slug,
        imageUrl ?? undefined,
        iconUrl ?? undefined,
        dto.description,
        dto.sortOrder,
        dto.isActive,
        dto.parentId,
      ),
    )) as unknown as { category: Record<string, unknown> };
    return {
      category: await CategoryFormatter.category(
        result.category,
        this.storageService,
      ),
    };
  }

  @Delete(':categoryId')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.OK)
  async delete(
    @Param('categoryId') categoryId: string,
  ): Promise<{ success: true }> {
    return await this.commandBus.execute(new DeleteCategoryCommand(categoryId));
  }

  // ── Helpers ──────────────────────────────────────────────────

  private async extractCategoryFiles(
    req: FastifyRequest,
  ): Promise<{ imageUrl: string | null; iconUrl: string | null }> {
    const body = req.body as Record<string, unknown>;

    const imageFile = body.image as MultipartFile | undefined;
    const iconFile = body.icon as MultipartFile | undefined;

    const imageUrl = imageFile?.toBuffer
      ? await this.storageService.storeFile({
          buffer: await imageFile.toBuffer(),
          originalName: imageFile.filename,
          mimeType: imageFile.mimetype,
          destinationDir: 'uploads/categories',
        })
      : null;

    const iconUrl = iconFile?.toBuffer
      ? await this.storageService.storeFile({
          buffer: await iconFile.toBuffer(),
          originalName: iconFile.filename,
          mimeType: iconFile.mimetype,
          destinationDir: 'uploads/categories/icons',
        })
      : null;

    return { imageUrl, iconUrl };
  }
}
