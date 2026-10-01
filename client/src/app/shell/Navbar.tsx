import { NavLink, ScrollArea } from '@mantine/core';
import { Link, useRouterState } from '@tanstack/react-router';

import { useCurrentUser } from '@/stores/session.store';
import { useUiStore } from '@/stores/ui.store';

import { LiveClock, ShiftBadge } from './LiveClock';
import { navItems } from './nav-items';
import classes from './shell.module.css';

/** `showClock`: below 62em the header has no room for the clock / shift badge, so they sit at the top of the nav. */
export function Navbar({ showClock = false }: { showClock?: boolean }) {
  const user = useCurrentUser();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const closeMobile = useUiStore((s) => s.setMobileNav);
  return (
    <ScrollArea h="100%" type="hover">
      {showClock && (
        <div className={classes.navClock}>
          <LiveClock />
          <ShiftBadge />
        </div>
      )}
      {navItems
        .filter((g) => !g.roles || (user && g.roles.includes(user.role)))
        .map((g) => (
          <div key={g.group}>
            <div className={classes.navGroup}>{g.group}</div>
            {g.items.map((it) => {
              const active = it.exact ? pathname === it.to : pathname === it.to || pathname.startsWith(it.to + '/');
              return (
                <NavLink
                  key={it.to}
                  component={Link}
                  to={it.to}
                  label={it.label}
                  leftSection={<it.icon size={16} stroke={1.8} />}
                  active={active}
                  className={classes.navLink}
                  onClick={() => closeMobile(false)}
                />
              );
            })}
          </div>
        ))}
    </ScrollArea>
  );
}
