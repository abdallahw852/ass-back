import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { WishlistOrmEntity } from '../persistence/wishlist.orm-entity';

@Injectable()
export class WishlistRepository {
  constructor(
    @InjectRepository(WishlistOrmEntity, 'write')
    private readonly repo: Repository<WishlistOrmEntity>,
  ) {}

  async findByBuyer(buyerId: number): Promise<WishlistOrmEntity[]> {
    return this.repo.find({ where: { buyerId }, order: { createdAt: 'DESC' } });
  }

  async add(buyerId: number, productId: number): Promise<WishlistOrmEntity> {
    const existing = await this.repo.findOne({ where: { buyerId, productId } });
    if (existing) throw new ConflictException('Product already in wishlist.');
    const item = this.repo.create({ buyerId, productId });
    return this.repo.save(item);
  }

  async remove(buyerId: number, productId: number): Promise<void> {
    await this.repo.delete({ buyerId, productId });
  }
}
