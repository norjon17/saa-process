import { Button, Center, Drawer, Loader } from '@mantine/core';
import { IconHistory } from '@tabler/icons-react';
import { lazy, Suspense, useState } from 'react';

import type { AuditEntity } from '@/lib/api/types';
import { useIsMobile } from '@/lib/useIsMobile';

import classes from './change-logs.module.css';

// Separate chunk: the virtualiser + list code loads the first time a drawer is opened.
const ChangeLogDrawerContent = lazy(() => import('./ChangeLogDrawer'));

/** "Change logs" header action + right-hand drawer (full-screen on phones); the drawer body is mounted only while open. */
export function ChangeLogButton({ module, entities }: { module: string; entities: readonly AuditEntity[] }) {
  const [opened, setOpened] = useState(false);
  const isMobile = useIsMobile();
  return (
    <>
      <Button size="xs" variant="default" leftSection={<IconHistory size={14} />} onClick={() => setOpened(true)}>
        Change logs
      </Button>
      <Drawer
        opened={opened}
        onClose={() => setOpened(false)}
        title={`Change logs — ${module}`}
        position="right"
        size={isMobile ? '100%' : 'lg'}
        padding={isMobile ? 'sm' : 'md'}
        classNames={{ content: classes.drawerContent, body: classes.drawerBody }}
      >
        {opened && (
          <Suspense
            fallback={
              <Center py="xl">
                <Loader size="sm" />
              </Center>
            }
          >
            <ChangeLogDrawerContent entities={entities} />
          </Suspense>
        )}
      </Drawer>
    </>
  );
}
