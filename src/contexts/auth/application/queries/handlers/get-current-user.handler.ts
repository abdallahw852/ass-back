import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GetCurrentUserQuery } from '../get-current-user.query';
import { USER_REPOSITORY } from '../../../domain/repositories/user.repository.interface';
import type { IUserRepository } from '../../../domain/repositories/user.repository.interface';
import { UserRole } from '../../../domain/enums/user-role.enum';
import { SupplierMemberOrmEntity } from '../../../../organization/infrastructure/persistence/supplier-member.orm-entity';
import { SubscriptionOrmEntity } from '../../../../supplier/subscription/infrastructure/persistence/subscription.orm-entity';

export type OnboardingStep =
  | 'account_details'
  | 'plan'
  | 'profile'
  | 'complete';

@QueryHandler(GetCurrentUserQuery)
export class GetCurrentUserHandler implements IQueryHandler<
  GetCurrentUserQuery,
  unknown
> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @InjectRepository(SupplierMemberOrmEntity, 'write')
    private readonly memberRepo: Repository<SupplierMemberOrmEntity>,
    @InjectRepository(SubscriptionOrmEntity, 'write')
    private readonly subscriptionRepo: Repository<SubscriptionOrmEntity>,
  ) {}

  async execute(query: GetCurrentUserQuery): Promise<unknown> {
    const user = await this.userRepository.findByPublicId(query.publicId);
    if (!user) return null;
    const { supplier, ...userData } = user;

    let permissions: string[] | null = null;
    if (user.role === UserRole.SUPPLIER_EMPLOYEE && user.id) {
      const member = await this.memberRepo.findOne({
        where: { user_id: user.id },
        select: ['permissions'],
      });
      permissions = member?.permissions ?? null;
    }

    const onboardingStep = await this.resolveOnboardingStep(
      user.role,
      user.onboardingCompletedAt,
      supplier,
    );

    return {
      ...userData,
      supplierPublicId: supplier?._id ?? null,
      supplier: supplier ?? null,
      permissions,
      onboardingStep,
    };
  }

  /**
   * Determines where a user sits in the registration journey so the client can
   * resume an abandoned signup at the correct step instead of the dashboard.
   * Only self-onboarding suppliers have intermediate steps; everyone else is
   * considered complete once they reach this handler.
   */
  private async resolveOnboardingStep(
    role: UserRole,
    onboardingCompletedAt: Date | null,
    supplier: { id: number } | null,
  ): Promise<OnboardingStep> {
    if (role !== UserRole.SUPPLIER) return 'complete';
    if (onboardingCompletedAt) return 'complete';
    if (!supplier) return 'account_details';

    const activeSubscription = await this.subscriptionRepo.findOne({
      where: { supplierId: supplier.id, status: 'active' },
    });
    if (!activeSubscription) return 'plan';

    return 'profile';
  }
}
