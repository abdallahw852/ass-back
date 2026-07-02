import { BadRequestException, Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SetPricingTiersCommand } from '../set-pricing-tiers.command';
import { PricingTier } from '../../../domain/pricing-tier.value-object';
import type { IProductRepository } from '../../../domain/product.repository.interface';
import { PRODUCT_REPOSITORY } from '../../../domain/product.repository.interface';
import { ProductNotFoundException } from '../../../domain/product.exceptions';
import { PricingTierOrmEntity } from '../../../infrastructure/persistence/pricing-tier.orm-entity';
import { randomUUID } from 'node:crypto';

@CommandHandler(SetPricingTiersCommand)
export class SetPricingTiersHandler implements ICommandHandler<SetPricingTiersCommand> {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepo: IProductRepository,
    @InjectRepository(PricingTierOrmEntity, 'write')
    private readonly tierRepo: Repository<PricingTierOrmEntity>,
  ) {}

  async execute(command: SetPricingTiersCommand) {
    const { productId, supplierId, tiers } = command;

    const product = await this.productRepo.findByPublicId(productId);
    if (!product) throw new ProductNotFoundException(productId);
    product.assertOwnedBy(supplierId);

    // Validate tiers using the existing domain VO
    const domainTiers = tiers.map((t) =>
      PricingTier.create(t.minQuantity, t.maxQuantity ?? null, t.unitPrice),
    );

    // Check for overlapping ranges
    const sorted = [...domainTiers].sort(
      (a, b) => a.minQuantity - b.minQuantity,
    );
    for (let i = 0; i < sorted.length - 1; i++) {
      const current = sorted[i];
      const next = sorted[i + 1];
      if (
        current.maxQuantity === null ||
        current.maxQuantity >= next.minQuantity
      ) {
        throw new BadRequestException(
          `Tier ranges overlap between minQuantity ${current.minQuantity} and ${next.minQuantity}.`,
        );
      }
    }

    const ormTiers = sorted.map((t) => {
      const orm = new PricingTierOrmEntity();
      orm._id = randomUUID();
      orm.productId = product.internalId!;
      orm.minQuantity = t.minQuantity;
      orm.maxQuantity = t.maxQuantity;
      orm.unitPrice = t.unitPrice;
      orm.currency = product.currency;
      return orm;
    });

    const saved = await this.tierRepo.manager.transaction(async (em) => {
      await em.delete(PricingTierOrmEntity, {
        productId: product.internalId!,
      });
      return em.save(ormTiers);
    });

    return {
      tiers: saved.map((t) => ({
        _id: t._id,
        minQuantity: t.minQuantity,
        maxQuantity: t.maxQuantity,
        unitPrice: Number(t.unitPrice),
        currency: t.currency,
      })),
    };
  }
}
