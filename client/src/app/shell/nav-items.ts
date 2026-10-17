import type { UserRole } from '@shared/domain';
import {
  IconAdjustments,
  IconCalendarStats,
  IconClipboardList,
  IconCpu,
  IconFlask,
  IconHistory,
  IconLayoutGrid,
  IconListDetails,
  IconSettings,
  IconSettingsCog,
  IconShieldLock,
  IconTool,
  IconUpload,
  IconUsers,
  type Icon,
} from '@tabler/icons-react';

export interface NavItem {
  to: string;
  label: string;
  icon: Icon;
  exact?: boolean;
}
export interface NavGroup {
  group: string;
  /** Icon of the collapsible group ("folder") in the navbar. */
  icon: Icon;
  roles?: UserRole[];
  items: NavItem[];
}

export const navItems: NavGroup[] = [
  {
    group: 'Endorsement',
    icon: IconClipboardList,
    items: [
      { to: '/endorsement', label: 'Shift Board', icon: IconClipboardList, exact: true },
      { to: '/endorsement/history', label: 'History', icon: IconHistory },
    ],
  },
  {
    group: 'Meancheck',
    icon: IconFlask,
    items: [
      { to: '/meancheck', label: 'Lots', icon: IconFlask, exact: true },
      { to: '/meancheck/new', label: 'New Verdict', icon: IconUpload },
      { to: '/meancheck/status', label: 'Tool Status', icon: IconLayoutGrid },
      { to: '/first-meancheck', label: '1st MC Daily', icon: IconCalendarStats },
    ],
  },
  {
    group: 'Maintenance',
    icon: IconSettingsCog,
    items: [
      { to: '/pm-status', label: 'PM Status', icon: IconTool },
      { to: '/contact-chip', label: 'Contact Chip', icon: IconCpu },
    ],
  },
  {
    group: 'Admin',
    icon: IconShieldLock,
    roles: ['admin'],
    items: [
      { to: '/admin/users', label: 'Users', icon: IconUsers },
      { to: '/admin/tools', label: 'Tools', icon: IconSettings },
      { to: '/admin/models', label: 'Model Specs', icon: IconAdjustments },
      { to: '/admin/categories', label: 'Categories', icon: IconListDetails },
    ],
  },
];

export const isNavItemActive = (it: NavItem, pathname: string) => (it.exact ? pathname === it.to : pathname === it.to || pathname.startsWith(it.to + '/'));

/**
 * Group + item for a pathname (breadcrumb, auto-opening the active group). The most specific match wins, so
 * `/meancheck/new` resolves to "New Verdict" and `/meancheck/12` falls back to "Lots" (exact items also match their
 * detail pages here).
 */
export function findNavItem(pathname: string): { group: NavGroup; item: NavItem } | null {
  let best: { group: NavGroup; item: NavItem } | null = null;
  for (const group of navItems) {
    for (const item of group.items) {
      const hit = pathname === item.to || pathname.startsWith(item.to + '/');
      if (hit && (!best || item.to.length > best.item.to.length)) best = { group, item };
    }
  }
  return best;
}
