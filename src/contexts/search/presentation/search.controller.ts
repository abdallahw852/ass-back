import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import type { FastifyRequest } from 'fastify';
import { AllowUnverified } from '../../../shared/decorators/allow-unverified.decorator';
import { AdminGuard } from '../../../shared/guards/admin.guard';
import { ReindexAllProductsCommand } from '../application/commands/reindex-all-products.command';
import { SearchProductsQuery } from '../application/queries/search-products.query';
import { SuggestProductsQuery } from '../application/queries/suggest-products.query';
import { ImageSearchQuery } from '../application/queries/image-search.query';
import { SearchProductsQueryDto } from './dto/search-products-query.dto';
import { SuggestQueryDto } from './dto/suggest-query.dto';

type MultipartFile = { toBuffer: () => Promise<Buffer>; filename: string };

@Throttle({ search: { limit: 60, ttl: 60000 } })
@Controller('search')
export class SearchController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post('admin/reindex')
  @HttpCode(202)
  @UseGuards(AdminGuard)
  @SkipThrottle()
  async reindexAll(): Promise<{ status: string }> {
    return this.commandBus.execute(new ReindexAllProductsCommand());
  }

  @Get('products')
  @AllowUnverified()
  async search(
    @Query() dto: SearchProductsQueryDto,
  ): Promise<Record<string, unknown>> {
    return this.queryBus.execute(
      new SearchProductsQuery({
        q: dto.q,
        categoryIds: dto.categoryIds,
        countries: dto.countries,
        supplierTypes: dto.supplierTypes,
        verifiedOnly: dto.verifiedOnly,
        priceMin: dto.priceMin,
        priceMax: dto.priceMax,
        moqMin: dto.moqMin,
        moqMax: dto.moqMax,
        sort: dto.sort,
        page: dto.page ?? 1,
        limit: Math.min(dto.limit ?? 24, 60),
        facets: dto.facets !== false,
      }),
    );
  }

  @Get('products/suggest')
  @AllowUnverified()
  async suggest(
    @Query() dto: SuggestQueryDto,
  ): Promise<{ suggestions: string[] }> {
    return this.queryBus.execute(new SuggestProductsQuery(dto.q));
  }

  @Post('products/image')
  @AllowUnverified()
  async imageSearch(
    @Req() req: FastifyRequest,
  ): Promise<Record<string, unknown>> {
    const body = req.body as Record<string, unknown>;
    const file = body.image as MultipartFile | undefined;
    if (!file?.toBuffer) {
      throw new BadRequestException('An image file is required.');
    }
    const buffer = await file.toBuffer();
    return this.queryBus.execute(new ImageSearchQuery(buffer));
  }
}
