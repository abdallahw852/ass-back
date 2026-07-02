import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';

export class CategoryNotFoundException extends NotFoundException {
  constructor(id: string) {
    super(`Category '${id}' not found.`);
  }
}

export class DuplicateCategorySlugException extends ConflictException {
  constructor(slug: string) {
    super(`A category with slug '${slug}' already exists at this level.`);
  }
}

export class CategoryHasChildrenException extends BadRequestException {
  constructor(id: string) {
    super(
      `Category '${id}' cannot be deleted because it has child categories. Remove or re-parent them first.`,
    );
  }
}
