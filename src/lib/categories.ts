import type { Category, Product } from './types';

export interface CategoryNode extends Category {
  children: Category[];
}

/** Top-level categories, each with its sub-categories. */
export function categoryTree(list: Category[]): CategoryNode[] {
  return list
    .filter((c) => !c.parentId)
    .map((t) => ({ ...t, children: list.filter((c) => c.parentId === t.id) }));
}

/** "Adults › T-shirts" for a product in a sub-category, otherwise just its category. */
export function categoryPath(p: Pick<Product, 'categoryName' | 'parentCategoryName'>): string {
  if (!p.categoryName) return '—';
  return p.parentCategoryName ? `${p.parentCategoryName} › ${p.categoryName}` : p.categoryName;
}

/** The top-level category name of a product (used where a short label is needed). */
export const topCategoryName = (p: Pick<Product, 'categoryName' | 'parentCategoryName'>): string | null =>
  p.parentCategoryName ?? p.categoryName;
