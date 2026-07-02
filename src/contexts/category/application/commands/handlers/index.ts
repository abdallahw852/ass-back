import { CreateCategoryHandler } from './create-category.handler';
import { UpdateCategoryHandler } from './update-category.handler';
import { DeleteCategoryHandler } from './delete-category.handler';

export const CategoryCommandHandlers = [
  CreateCategoryHandler,
  UpdateCategoryHandler,
  DeleteCategoryHandler,
];
