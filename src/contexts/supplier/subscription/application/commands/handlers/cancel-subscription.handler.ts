import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CancelSubscriptionCommand } from '../cancel-subscription.command';
import { SUBSCRIPTION_REPOSITORY } from '../../../domain/subscription.repository.interface';
import type { ISubscriptionRepository } from '../../../domain/subscription.repository.interface';
import { SUPPLIER_REPOSITORY } from '../../../../identity/domain/repositories/supplier.repository.interface';
import type { ISupplierRepository } from '../../../../identity/domain/repositories/supplier.repository.interface';
import { SubscriptionOrmEntity } from '../../../infrastructure/persistence/subscription.orm-entity';
import {
  NoActiveSubscriptionException,
  SubscriptionAlreadyCancelledException,
  SupplierProfileNotFoundException,
} from '../../../domain/subscription.exceptions';

@CommandHandler(CancelSubscriptionCommand)
export class CancelSubscriptionHandler implements ICommandHandler<
  CancelSubscriptionCommand,
  SubscriptionOrmEntity
> {
  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY)
    private readonly subscriptionRepository: ISubscriptionRepository,
    @Inject(SUPPLIER_REPOSITORY)
    private readonly supplierRepository: ISupplierRepository,
  ) {}

  async execute(
    command: CancelSubscriptionCommand,
  ): Promise<SubscriptionOrmEntity> {
    const supplier = await this.supplierRepository.findByUserId(command.userId);
    if (!supplier) throw new SupplierProfileNotFoundException();

    const subscription = await this.subscriptionRepository.findBySupplierId(
      supplier.id,
    );
    if (!subscription || subscription.status !== 'active')
      throw new NoActiveSubscriptionException();

    if (subscription.cancelAtPeriodEnd)
      throw new SubscriptionAlreadyCancelledException();

    return this.subscriptionRepository.save({
      ...subscription,
      cancelAtPeriodEnd: true,
    });
  }
}
