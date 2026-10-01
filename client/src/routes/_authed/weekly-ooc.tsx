import { createFileRoute } from '@tanstack/react-router';

import { WeeklyOocPage } from '@/features/minor/weekly-ooc/WeeklyOocPage';

export const Route = createFileRoute('/_authed/weekly-ooc')({
  component: WeeklyOocPage,
});
