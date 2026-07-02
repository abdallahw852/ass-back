import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreateCategoryCommand } from '../create-category.command';
import { Category } from '../../../domain/category.entity';
import type { ICategoryRepository } from '../../../domain/category.repository.interface';
import { CATEGORY_REPOSITORY } from '../../../domain/category.repository.interface';
import {
  CategoryNotFoundException,
  DuplicateCategorySlugException,
} from '../../../domain/category.exceptions';
import { CategoryMapper } from '../../../infrastructure/mappers/category.mapper';

@CommandHandler(CreateCategoryCommand)
export class CreateCategoryHandler implements ICommandHandler<CreateCategoryCommand> {
  constructor(
    @Inject(CATEGORY_REPOSITORY)
    private readonly categoryRepo: ICategoryRepository,
  ) {}

  async execute(command: CreateCategoryCommand) {
    const existing = await this.categoryRepo.findBySlug(
      command.slug,
      command.parentId ?? null,
    );
    if (existing) {
      throw new DuplicateCategorySlugException(command.slug);
    }

    // Derive level from parent rather than trusting the client-supplied value.
    let derivedLevel = 0;
    if (command.parentId) {
      const parent = await this.categoryRepo.findByInternalId(command.parentId);
      if (!parent)
        throw new CategoryNotFoundException(String(command.parentId));
      derivedLevel = parent.level + 1;
    }

    const category = Category.create({
      name: command.name,
      nameAr: command.nameAr,
      slug: command.slug,
      parentId: command.parentId,
      imageUrl: command.imageUrl,
      iconUrl: command.iconUrl,
      description: command.description,
      sortOrder: command.sortOrder,
      level: derivedLevel,
    });

    const saved = await this.categoryRepo.save(category);
    return { category: CategoryMapper.toResponse(saved) };
  }
}
