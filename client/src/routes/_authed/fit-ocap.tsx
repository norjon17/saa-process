import { createFileRoute } from '@tanstack/react-router';

import { FitOcapPage } from '@/features/minor/fit-ocap/FitOcapPage';

export const Route = createFileRoute('/_authed/fit-ocap')({
  component: FitOcapPage,
});
