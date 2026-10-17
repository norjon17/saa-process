import { Anchor, Breadcrumbs as MantineBreadcrumbs, Text } from '@mantine/core';
import { IconChevronRight, IconHome } from '@tabler/icons-react';
import { Link, useRouterState } from '@tanstack/react-router';
import { useEffect } from 'react';

import { useUiStore } from '@/stores/ui.store';

import { findNavItem } from './nav-items';
import classes from './shell.module.css';

/** Detail pages name their last breadcrumb segment (e.g. the lot number); cleared again when the page unmounts. */
export function useBreadcrumb(label: string | null | undefined) {
  const set = useUiStore((s) => s.setCrumbDetail);
  useEffect(() => {
    set(label ?? null);
    return () => set(null);
  }, [label, set]);
}

/** Home › Group › Page [› detail], derived from the nav tree (Stratum-style bar above the page). */
export function Breadcrumbs() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const detail = useUiStore((s) => s.crumbDetail);
  const hit = findNavItem(pathname);
  if (!hit) return null;
  const onItemPage = pathname === hit.item.to;

  return (
    <MantineBreadcrumbs
      className={`${classes.crumbs} saa-no-print`}
      separator={<IconChevronRight size={12} />}
      separatorMargin={6}
      aria-label="Breadcrumb"
    >
      <Anchor component={Link} to="/endorsement" c="dimmed" aria-label="Home" className={classes.crumbHome}>
        <IconHome size={14} />
      </Anchor>
      <Text size="xs" c="dimmed">
        {hit.group.group}
      </Text>
      {onItemPage ? (
        <Text size="xs" fw={700} aria-current="page">
          {hit.item.label}
        </Text>
      ) : (
        <Anchor component={Link} to={hit.item.to} size="xs" c="dimmed">
          {hit.item.label}
        </Anchor>
      )}
      {!onItemPage && detail && (
        <Text size="xs" fw={700} aria-current="page" className={classes.crumbDetail}>
          {detail}
        </Text>
      )}
    </MantineBreadcrumbs>
  );
}
