import { Box, Paper, PinInput, Stack, Text, Title } from '@mantine/core';
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { z } from 'zod';

import { Logo } from '@/app/shell/BrandGroup';
import { meQuery, useLogin } from '@/features/auth/api';
import classes from '@/features/auth/login.module.css';
import { ApiError } from '@/lib/api/client';
import { useIsMobile } from '@/lib/useIsMobile';
import { useUiStore } from '@/stores/ui.store';
import { HEADER_GRADIENT_LIGHT } from '@/theme/colors';

const searchSchema = z.object({ redirect: z.string().optional() });

export const Route = createFileRoute('/login')({
  validateSearch: (s) => searchSchema.parse(s),
  beforeLoad: async ({ context, search }) => {
    const me = await context.queryClient.ensureQueryData(meQuery).catch(() => null);
    if (me?.user) throw redirect({ to: search.redirect && search.redirect.startsWith('/') ? search.redirect : '/endorsement' });
  },
  component: LoginPage,
});

function LoginPage() {
  const login = useLogin();
  const navigate = useNavigate();
  const { redirect: target } = Route.useSearch();
  const lastIdNo = useUiStore((s) => s.lastIdNo);
  const setLastIdNo = useUiStore((s) => s.setLastIdNo);
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const isMobile = useIsMobile();

  const submit = (idNo: string) => {
    if (idNo.length !== 4) return;
    setError(null);
    login.mutate(idNo, {
      onSuccess: () => {
        setLastIdNo(idNo);
        void navigate({ to: target && target.startsWith('/') ? target : '/endorsement' });
      },
      onError: (e) => {
        setError(e instanceof ApiError ? e.message : 'Login failed');
        setValue('');
      },
    });
  };

  return (
    <Box className={classes.screen} style={{ background: HEADER_GRADIENT_LIGHT }}>
      <Paper radius="lg" p={isMobile ? 'lg' : 'xl'} shadow="xl" className={classes.card}>
        <Stack align="center" gap="sm">
          <Logo size={64} />
          <Title order={3} ta="center" className="saa-gradient-text">
            SAA Process Endorsement
          </Title>
          <Text size="xs" c="dimmed" ta="center">
            Western Digital Corporation · HDD Components
          </Text>
          <Text fw={700} mt="md">
            Enter your 4-digit ID number
          </Text>
          <PinInput
            length={4}
            type="number"
            inputMode="numeric"
            size={isMobile ? 'xl' : 'lg'}
            autoFocus
            oneTimeCode
            value={value}
            onChange={setValue}
            onComplete={submit}
            error={!!error}
            disabled={login.isPending}
            aria-label="ID number"
          />
          {error && (
            <Text c="red" size="sm" fw={600}>
              {error}
            </Text>
          )}
          {lastIdNo && !error && (
            <Text size="xs" c="dimmed">
              Last signed in: ID {lastIdNo}
            </Text>
          )}
        </Stack>
      </Paper>
    </Box>
  );
}
