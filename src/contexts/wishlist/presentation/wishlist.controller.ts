import {
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import type { FastifyRequest } from 'fastify';
import { SessionAuthGuard } from '../../../shared/infrastructure/guards/session-auth.guard';
import { WishlistRepository } from '../infrastructure/repositories/wishlist.repository';
import { ProductOrmEntity } from '../../product/infrastructure/persistence/product.orm-entity';
import { ProductStatus } from '../../product/domain/enums/product-status.enum';

type SessionRequest = FastifyRequest & {
  session: { user: { id: number; verifiedAt: Date | null } };
};

@Controller('wishlist')
@UseGuards(SessionAuthGuard)
export class WishlistController {
  constructor(
    private readonly wishlistRepo: WishlistRepository,
    @InjectRepository(ProductOrmEntity, 'write')
    private readonly productRepo: Repository<ProductOrmEntity>,
  ) {}

  private async resolveProduct(
    publicId: string,
  ): Promise<{ id: number; _id: string }> {
    const product = await this.productRepo.findOne({
      where: { _id: publicId },
      select: ['id', '_id', 'status'],
    });
    if (!product || product.status !== ProductStatus.ACTIVE)
      throw new NotFoundException(`Product '${publicId}' not found.`);
    return product;
  }

  @Get()
  async getWishlist(
    @Req() req: FastifyRequest,
  ): Promise<{ items: { productId: string; createdAt: Date }[] }> {
    const buyerId = (req as SessionRequest).session.user.id;
    const items = await this.wishlistRepo.findByBuyer(buyerId);

    const productIds = items.map((i) => i.productId);
    const products =
      productIds.length > 0
        ? await this.productRepo
            .createQueryBuilder('p')
            .select(['p.id', 'p._id'])
            .whereInIds(productIds)
            .getMany()
        : [];

    const publicIdMap = new Map(products.map((p) => [p.id, p._id]));

    return {
      items: items.map((i) => ({
        productId: publicIdMap.get(i.productId) ?? String(i.productId),
        createdAt: i.createdAt,
      })),
    };
  }

  @Post(':productId')
  async add(
    @Param('productId') productId: string,
    @Req() req: FastifyRequest,
  ): Promise<{ productId: string; createdAt: Date }> {
    const buyerId = (req as SessionRequest).session.user.id;
    const product = await this.resolveProduct(productId);
    const item = await this.wishlistRepo.add(buyerId, product.id);
    return { productId: product._id, createdAt: item.createdAt };
  }

  @Delete(':productId')
  async remove(
    @Param('productId') productId: string,
    @Req() req: FastifyRequest,
  ): Promise<{ removed: boolean }> {
    const buyerId = (req as SessionRequest).session.user.id;
    const product = await this.resolveProduct(productId);
    await this.wishlistRepo.remove(buyerId, product.id);
    return { removed: true };
  }
}
