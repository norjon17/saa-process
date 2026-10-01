import { localStorageColorSchemeManager, MantineProvider } from '@mantine/core';
import { DatesProvider } from '@mantine/dates';
import { ModalsProvider } from '@mantine/modals';
import { Notifications } from '@mantine/notifications';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';

import { cssVariablesResolver, theme } from '@/theme/theme';

import { queryClient } from './query-client';
import { router } from './router';

const colorSchemeManager = localStorageColorSchemeManager({ key: 'saa-color-scheme' });

export function App() {
  return (
    <MantineProvider theme={theme} cssVariablesResolver={cssVariablesResolver} defaultColorScheme="light" colorSchemeManager={colorSchemeManager}>
      <DatesProvider settings={{ locale: 'en', firstDayOfWeek: 1 }}>
        <ModalsProvider>
          <Notifications position="bottom-right" limit={3} />
          <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
          </QueryClientProvider>
        </ModalsProvider>
      </DatesProvider>
    </MantineProvider>
  );
}
