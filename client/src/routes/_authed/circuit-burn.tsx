import { createFileRoute } from '@tanstack/react-router';

import { CircuitBurnPage } from '@/features/minor/circuit-burn/CircuitBurnPage';

export const Route = createFileRoute('/_authed/circuit-burn')({
  component: CircuitBurnPage,
});
