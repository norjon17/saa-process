import { AppShell as MantineAppShell, Burger, Container, Group } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { Outlet } from '@tanstack/react-router';

import { useIsMobile } from '@/lib/useIsMobile';
import { useUiStore } from '@/stores/ui.store';

import { BrandGroup } from './BrandGroup';
import { LiveClock, ShiftBadge } from './LiveClock';
import { Navbar } from './Navbar';
import classes from './shell.module.css';
import { ThemeToggle } from './ThemeToggle';
import { UserMenu } from './UserMenu';

export function AppShell() {
  const navCollapsed = useUiStore((s) => s.navCollapsed);
  const mobileOpen = useUiStore((s) => s.mobileNavOpen);
  const toggleNav = useUiStore((s) => s.toggleNav);
  const setMobileNav = useUiStore((s) => s.setMobileNav);
  const headerActions = useUiStore((s) => s.headerActions);
  const isNarrow = useMediaQuery('(max-width: 62em)');
  // Phones: page actions (CSV / Excel / Print…) move out of the header into a toolbar above the page.
  const isMobile = useIsMobile();

  return (
    <MantineAppShell
      header={{ height: 62 }}
      // Below md (992px: phones + tablets) the navbar is a slide-over drawer so the page keeps the full width.
      navbar={{ width: 236, breakpoint: 'md', collapsed: { mobile: !mobileOpen, desktop: navCollapsed } }}
      padding={{ base: 'xs', sm: 'md' }}
    >
      <MantineAppShell.Header className={classes.header}>
        <Group gap={10} wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
          <Burger opened={mobileOpen} onClick={() => setMobileNav(!mobileOpen)} hiddenFrom="md" size="sm" color="white" aria-label="Open navigation" />
          <Burger opened={!navCollapsed} onClick={toggleNav} visibleFrom="md" size="sm" color="white" aria-label="Toggle navigation" />
          <BrandGroup compact={!!isNarrow} />
        </Group>
        <Group gap={8} wrap="nowrap" className="saa-no-print">
          {!isMobile && headerActions}
          {!isNarrow && <LiveClock />}
          {!isNarrow && <ShiftBadge />}
          <ThemeToggle />
          <UserMenu compact={isMobile} />
        </Group>
      </MantineAppShell.Header>
      <MantineAppShell.Navbar className={classes.navbar} p={0}>
        <Navbar showClock={isNarrow} />
      </MantineAppShell.Navbar>
      <MantineAppShell.Main className={classes.main}>
        <Container size={1480} px={0}>
          {isMobile && headerActions && <div className={`${classes.mobileActions} saa-no-print`}>{headerActions}</div>}
          <Outlet />
        </Container>
      </MantineAppShell.Main>
    </MantineAppShell>
  );
}
