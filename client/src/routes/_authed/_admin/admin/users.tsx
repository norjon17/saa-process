import { createFileRoute } from '@tanstack/react-router';

import { UsersPage } from '@/features/admin/users/UsersPage';

export const Route = createFileRoute('/_authed/_admin/admin/users')({
  component: UsersPage,
});
