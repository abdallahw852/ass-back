import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import type { IOrderDraftRepository } from '../../domain/order-draft.repository.interface';
import { ORDER_DRAFT_REPOSITORY } from '../../domain/order-draft.repository.interface';
import type { OrderDraftOrmEntity } from '../../infrastructure/persistence/order-draft.orm-entity';
import { CreateOrderDraftFromQuotationCommand } from './create-order-draft-from-quotation.command';

@CommandHandler(CreateOrderDraftFromQuotationCommand)
export class CreateOrderDraftFromQuotationHandler implements ICommandHandler<CreateOrderDraftFromQuotationCommand> {
  constructor(
    @Inject(ORDER_DRAFT_REPOSITORY)
    private readonly orderDraftRepo: IOrderDraftRepository,
  ) {}

  async execute(
    command: CreateOrderDraftFromQuotationCommand,
  ): Promise<OrderDraftOrmEntity> {
    return this.orderDraftRepo.save({
      buyerId: command.buyerId,
      supplierId: command.supplierId,
      rfqId: command.rfqId,
      quotationId: command.quotationId,
      productName: command.productName,
      items: command.items,
      currency: command.currency,
      subtotal: command.totalPrice,
      snapshot: command.snapshot,
    });
  }
}
