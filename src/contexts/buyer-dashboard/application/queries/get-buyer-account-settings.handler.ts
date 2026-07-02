import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { GetBuyerAccountSettingsQuery } from './get-buyer-account-settings.query';
import { UserOrmEntity } from '../../../auth/infrastructure/persistence/user.orm-entity';

export interface BuyerAccountSettingsResult {
  user: {
    _id: string;
    email: string;
    name: string | null;
    phone: string | null;
    avatar: string | null;
    country: string | null;
    verifiedAt: Date | null;
    createdAt: Date;
  };
}

@QueryHandler(GetBuyerAccountSettingsQuery)
export class GetBuyerAccountSettingsHandler implements IQueryHandler<GetBuyerAccountSettingsQuery> {
  constructor(
    @InjectRepository(UserOrmEntity, 'write')
    private readonly userRepo: Repository<UserOrmEntity>,
  ) {}

  async execute(
    query: GetBuyerAccountSettingsQuery,
  ): Promise<BuyerAccountSettingsResult> {
    const user = await this.userRepo.findOne({
      where: { id: query.userId },
      select: [
        '_id',
        'email',
        'name',
        'phone',
        'avatar',
        'country',
        'verifiedAt',
        'createdAt',
      ],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        avatar: user.avatar,
        country: user.country,
        verifiedAt: user.verifiedAt,
        createdAt: user.createdAt,
      },
    };
  }
}
