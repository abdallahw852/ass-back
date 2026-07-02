import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DeleteCategoryCommand } from '../delete-category.command';
import type { ICategoryRepository } from '../../../domain/category.repository.interface';
import { CATEGORY_REPOSITORY } from '../../../domain/category.repository.interface';
import {
  CategoryHasChildrenException,
  CategoryNotFoundException,
} from '../../../domain/category.exceptions';

@CommandHandler(DeleteCategoryCommand)
export class DeleteCategoryHandler implements ICommandHandler<DeleteCategoryCommand> {
  constructor(
    @Inject(CATEGORY_REPOSITORY)
    private readonly categoryRepo: ICategoryRepository,
  ) {}

  async execute(command: DeleteCategoryCommand): Promise<{ success: true }> {
    const category = await this.categoryRepo.findByPublicId(command.categoryId);
    if (!category) {
      throw new CategoryNotFoundException(command.categoryId);
    }

    // Guard: refuse to delete if the category has children (active or inactive).
    // Pass onlyActive=false so even disabled children block deletion.
    const children = await this.categoryRepo.findChildren(
      category.internalId,
      false,
    );
    if (children.length > 0) {
      throw new CategoryHasChildrenException(command.categoryId);
    }

    await this.categoryRepo.softDelete(category.internalId!);
    return { success: true };
  }
}
