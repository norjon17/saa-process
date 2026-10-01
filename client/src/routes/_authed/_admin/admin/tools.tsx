import { createFileRoute } from '@tanstack/react-router';

import { ToolsPage } from '@/features/admin/tools/ToolsPage';

export const Route = createFileRoute('/_authed/_admin/admin/tools')({
  component: ToolsPage,
});
