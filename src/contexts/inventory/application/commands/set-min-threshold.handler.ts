import { ForbiddenException, Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { SetMinThresholdCommand } from './set-min-threshold.command';
import type { IInventoryItemRepository } from '../../domain/inventory-item.repository.interface';
import { INVENTORY_ITEM_REPOSITORY } from '../../domain/inventory-item.repository.interface';
import { InventoryItemNotFoundException } from '../../domain/inventory.exceptions';

@CommandHandler(SetMinThresholdCommand)
export class SetMinThresholdHandler implements ICommandHandler<SetMinThresholdCommand> {
  constructor(
    @Inject(INVENTORY_ITEM_REPOSITORY)
    private readonly inventoryRepo: IInventoryItemRepository,
  ) {}

  async execute(command: SetMinThresholdCommand) {
    const item = await this.inventoryRepo.findById(command.inventoryItemId);
    if (!item)
      throw new InventoryItemNotFoundException(command.inventoryItemId);
    if (item.supplierId !== command.supplierId) throw new ForbiddenException();

    item.setMinThreshold(command.threshold);
    await this.inventoryRepo.save(item);

    return { minStockThreshold: item.minStockThreshold, status: item.status };
  }
}
