import type { UserRole } from '@shared/domain';
import {
  IconAdjustments,
  IconCalendarStats,
  IconChartBar,
  IconClipboardList,
  IconCpu,
  IconFlask,
  IconHistory,
  IconLayoutGrid,
  IconListDetails,
  IconMicroscope,
  IconSettings,
  IconTool,
  IconUpload,
  IconUsers,
  IconWaveSine,
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
  roles?: UserRole[];
  items: NavItem[];
}

export const navItems: NavGroup[] = [
  {
    group: 'Endorsement',
    items: [
      { to: '/endorsement', label: 'Shift Board', icon: IconClipboardList, exact: true },
      { to: '/endorsement/history', label: 'History', icon: IconHistory },
    ],
  },
  {
    group: 'Meancheck',
    items: [
      { to: '/meancheck', label: 'Lots', icon: IconFlask, exact: true },
      { to: '/meancheck/new', label: 'New Verdict', icon: IconUpload },
      { to: '/meancheck/status', label: 'Tool Status', icon: IconLayoutGrid },
      { to: '/first-meancheck', label: '1st MC Daily', icon: IconCalendarStats },
    ],
  },
  {
    group: 'Maintenance',
    items: [{ to: '/pm-status', label: 'PM Status', icon: IconTool }],
  },
  {
    group: 'Monitoring',
    items: [
      { to: '/low-cpk', label: 'Low Cpk', icon: IconChartBar },
      { to: '/circuit-burn', label: 'Circuit Burn', icon: IconWaveSine },
      { to: '/contact-chip', label: 'Contact Chip', icon: IconCpu },
      { to: '/fit-ocap', label: 'FIT OCAP', icon: IconMicroscope },
      { to: '/weekly-ooc', label: 'Weekly OOC', icon: IconListDetails },
    ],
  },
  {
    group: 'Admin',
    roles: ['admin'],
    items: [
      { to: '/admin/users', label: 'Users', icon: IconUsers },
      { to: '/admin/tools', label: 'Tools', icon: IconSettings },
      { to: '/admin/models', label: 'Model Specs', icon: IconAdjustments },
      { to: '/admin/categories', label: 'Categories', icon: IconListDetails },
    ],
  },
];
