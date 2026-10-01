import { createFileRoute } from '@tanstack/react-router';

import { ModelsPage } from '@/features/admin/models/ModelsPage';

export const Route = createFileRoute('/_authed/_admin/admin/models')({
  component: ModelsPage,
});
