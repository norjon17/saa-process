import { Tabs } from '@mantine/core';
import { memo } from 'react';

import type { SectionKey } from '@shared/domain';
import { SECTION_KEYS, SECTION_META } from '@shared/domain';

import { KpiTile } from '@/components/ui/KpiTile';
import type { BoardKpi } from '@/lib/api/types';

import classes from '../endorsement.module.css';
import { SECTION_ICONS } from '../sections';

const TAB_CLASSES = { tab: classes.kpiTab, tabLabel: classes.kpiTabLabel };

/**
 * The six section KPI tiles as the board's tab list. Must be rendered inside the board's `<Tabs>`
 * (the parent owns the active value + URL sync); arrow keys move between sections.
 */
export const BoardKpis = memo(function BoardKpis({ kpi, active }: { kpi: Record<SectionKey, BoardKpi>; active: SectionKey }) {
  return (
    <Tabs.List className={classes.kpiTabs} aria-label="Board sections">
      {SECTION_KEYS.map((key) => {
        const Icon = SECTION_ICONS[key];
        const k = kpi[key];
        return (
          <Tabs.Tab key={key} value={key} classNames={TAB_CLASSES} aria-label={`${SECTION_META[key].name}: ${k.total} rows, ${k.done} done, ${k.ongoing} ongoing`}>
            <KpiTile sectionKey={key} label={SECTION_META[key].name} value={k.total} sub={`${k.done} Done · ${k.ongoing} Ongoing`} icon={<Icon size={15} />} active={key === active} compactOnMobile />
          </Tabs.Tab>
        );
      })}
    </Tabs.List>
  );
});
