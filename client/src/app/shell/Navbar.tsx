import { NavLink, ScrollArea } from '@mantine/core';
import { Link, useRouterState } from '@tanstack/react-router';
import { useEffect } from 'react';

import { useCurrentUser } from '@/stores/session.store';
import { useUiStore } from '@/stores/ui.store';

import { LiveClock, ShiftBadge } from './LiveClock';
import { findNavItem, isNavItemActive, navItems } from './nav-items';
import classes from './shell.module.css';

/**
 * Multi-level navigation: each group is a collapsible "folder" (open state remembered per user); the group of the
 * current page opens automatically when you navigate into it.
 * `showClock`: below 62em the header has no room for the clock / shift badge, so they sit at the top of the nav.
 */
export function Navbar({ showClock = false }: { showClock?: boolean }) {
  const user = useCurrentUser();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const closeMobile = useUiStore((s) => s.setMobileNav);
  const groupsOpen = useUiStore((s) => s.navGroupsOpen);
  const setGroupOpen = useUiStore((s) => s.setNavGroupOpen);
  const activeGroup = findNavItem(pathname)?.group.group ?? null;

  useEffect(() => {
    if (activeGroup) setGroupOpen(activeGroup, true);
  }, [activeGroup, setGroupOpen]);

  return (
    <ScrollArea h="100%" type="hover">
      {showClock && (
        <div className={classes.navClock}>
          <LiveClock />
          <ShiftBadge />
        </div>
      )}
      <nav aria-label="Main" className={classes.navTree}>
        {navItems
          .filter((g) => !g.roles || (user && g.roles.includes(user.role)))
          .map((g) => (
            <NavLink
              key={g.group}
              label={g.group}
              leftSection={<g.icon size={18} stroke={1.8} />}
              opened={groupsOpen[g.group] ?? g.group === activeGroup}
              onChange={(open) => setGroupOpen(g.group, open)}
              childrenOffset={18}
              className={classes.navParent}
              data-current={g.group === activeGroup || undefined}
            >
              {g.items.map((it) => (
                <NavLink
                  key={it.to}
                  component={Link}
                  to={it.to}
                  label={it.label}
                  leftSection={<it.icon size={16} stroke={1.8} />}
                  active={isNavItemActive(it, pathname)}
                  className={classes.navLink}
                  onClick={() => closeMobile(false)}
                />
              ))}
            </NavLink>
          ))}
      </nav>
    </ScrollArea>
  );
}
