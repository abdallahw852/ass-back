import { GetCategoryTreeHandler } from './get-category-tree.handler';
import { GetCategoryHandler } from './get-category.handler';
import { GetCategoryChildrenHandler } from './get-category-children.handler';

export const CategoryQueryHandlers = [
  GetCategoryTreeHandler,
  GetCategoryHandler,
  GetCategoryChildrenHandler,
];
