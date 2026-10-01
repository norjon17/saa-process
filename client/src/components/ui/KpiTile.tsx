import { SimpleGrid, Text } from '@mantine/core';
import type { ReactNode } from 'react';

import type { SectionKey } from '@shared/domain';

import classes from './ui.module.css';

export interface KpiTileProps {
  sectionKey?: SectionKey;
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: ReactNode;
  onClick?: () => void;
  /** Selected state (e.g. the tile is the active tab): section-coloured border, tinted fill, thicker bar. */
  active?: boolean;
  /** Phones (below 768px): a dense tile — no icon or sub-line, smaller count — so a row of tiles stays short. */
  compactOnMobile?: boolean;
}

export function KpiTile({ sectionKey = 's6', label, value, sub, icon, onClick, active, compactOnMobile }: KpiTileProps) {
  return (
    <div
      className={classes.kpi}
      data-active={active || undefined}
      data-compact={compactOnMobile || undefined}
      style={{ ['--kpi-bar' as string]: `var(--saa-${sectionKey}-bar)`, ['--kpi-color' as string]: `var(--saa-${sectionKey}-text)`, ['--kpi-base' as string]: `var(--saa-${sectionKey}-base)` }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) onClick();
      }}
    >
      {icon && <div className={classes.kpiIcon}>{icon}</div>}
      <div className={classes.kpiLabel}>{label}</div>
      <div className={classes.kpiValue}>{value}</div>
      {sub && (
        <Text className={classes.kpiSub} component="div">
          {sub}
        </Text>
      )}
    </div>
  );
}

export function KpiRow({ children, cols = 6 }: { children: ReactNode; cols?: number }) {
  return (
    <SimpleGrid cols={{ base: 2, sm: 3, lg: cols }} spacing={10} mb="md">
      {children}
    </SimpleGrid>
  );
}
