import { Injectable } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetHomepageSectionsQuery } from '../get-homepage-sections.query';
import { CatalogRepository } from '../../../infrastructure/repositories/catalog.repository';

@QueryHandler(GetHomepageSectionsQuery)
@Injectable()
export class GetHomepageSectionsHandler implements IQueryHandler<GetHomepageSectionsQuery> {
  constructor(private readonly catalogRepo: CatalogRepository) {}

  async execute(_query: GetHomepageSectionsQuery) {
    const [recentlyArrived, bestDeals, topRated] = await Promise.all([
      this.catalogRepo.findRecentlyArrived(12),
      this.catalogRepo.findBestDeals(12),
      this.catalogRepo.findTopRated(12),
    ]);

    return {
      sections: [
        {
          type: 'recently_arrived',
          title: 'Recently Arrived',
          titleAr: 'وصل حديثاً',
          products: recentlyArrived,
        },
        {
          type: 'best_deals',
          title: 'Best Deals',
          titleAr: 'أفضل العروض',
          products: bestDeals,
        },
        {
          type: 'top_rated',
          title: 'Top Rated',
          titleAr: 'الأعلى تصنيفاً',
          products: topRated,
        },
      ],
    };
  }
}
