import { Injectable } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { IncrementViewCountCommand } from '../increment-view-count.command';
import { CatalogRepository } from '../../../infrastructure/repositories/catalog.repository';

@CommandHandler(IncrementViewCountCommand)
@Injectable()
export class IncrementViewCountHandler implements ICommandHandler<IncrementViewCountCommand> {
  constructor(private readonly catalogRepo: CatalogRepository) {}

  async execute(command: IncrementViewCountCommand): Promise<void> {
    await this.catalogRepo.incrementViewCount(command.productId);
  }
}
