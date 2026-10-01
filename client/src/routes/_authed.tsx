import { createFileRoute, redirect } from '@tanstack/react-router';

import { AppShell } from '@/app/shell/AppShell';
import { meQuery } from '@/features/auth/api';

export const Route = createFileRoute('/_authed')({
  beforeLoad: async ({ context, location }) => {
    const me = await context.queryClient.ensureQueryData(meQuery).catch(() => null);
    if (!me?.user) {
      throw redirect({ to: '/login', search: { redirect: location.href } });
    }
    return { user: me.user };
  },
  component: AppShell,
});
