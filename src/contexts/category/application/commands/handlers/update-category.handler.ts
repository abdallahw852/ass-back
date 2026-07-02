import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UpdateCategoryCommand } from '../update-category.command';
import type { ICategoryRepository } from '../../../domain/category.repository.interface';
import { CATEGORY_REPOSITORY } from '../../../domain/category.repository.interface';
import { CategoryNotFoundException } from '../../../domain/category.exceptions';
import { CategoryMapper } from '../../../infrastructure/mappers/category.mapper';

@CommandHandler(UpdateCategoryCommand)
export class UpdateCategoryHandler implements ICommandHandler<UpdateCategoryCommand> {
  constructor(
    @Inject(CATEGORY_REPOSITORY)
    private readonly categoryRepo: ICategoryRepository,
  ) {}

  async execute(command: UpdateCategoryCommand) {
    const category = await this.categoryRepo.findByPublicId(command.categoryId);
    if (!category) {
      throw new CategoryNotFoundException(command.categoryId);
    }

    // Derive level from parent when re-parenting; keep existing level otherwise.
    let derivedLevel: number | undefined;
    if (command.parentId !== undefined) {
      if (command.parentId === null) {
        derivedLevel = 0;
      } else {
        const parent = await this.categoryRepo.findByInternalId(
          command.parentId,
        );
        if (!parent)
          throw new CategoryNotFoundException(String(command.parentId));
        derivedLevel = parent.level + 1;
      }
    }

    category.updateDetails({
      name: command.name,
      nameAr: command.nameAr,
      slug: command.slug,
      imageUrl: command.imageUrl,
      iconUrl: command.iconUrl,
      description: command.description,
      sortOrder: command.sortOrder,
      isActive: command.isActive,
      parentId: command.parentId,
      level: derivedLevel,
    });

    const updated = await this.categoryRepo.update(category);
    return { category: CategoryMapper.toResponse(updated) };
  }
}
