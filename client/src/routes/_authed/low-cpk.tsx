import { createFileRoute } from '@tanstack/react-router';

import { LowCpkPage } from '@/features/minor/low-cpk/LowCpkPage';

export const Route = createFileRoute('/_authed/low-cpk')({
  component: LowCpkPage,
});
