import { createFileRoute } from '@tanstack/react-router';

import { CategoriesPage } from '@/features/admin/categories/CategoriesPage';

export const Route = createFileRoute('/_authed/_admin/admin/categories')({
  component: CategoriesPage,
});
