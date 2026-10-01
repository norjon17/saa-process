import type { ReactNode } from 'react';

import type { SectionKey } from '@shared/domain';
import { SECTION_META } from '@shared/domain';

import classes from './ui.module.css';

export interface SectionCardProps {
  sectionKey: SectionKey;
  name?: string;
  meta?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  id?: string;
}

/** The colored section card from the original dashboard (header bar + logo + name + actions). */
export function SectionCard({ sectionKey, name, meta, icon, actions, children, id }: SectionCardProps) {
  const m = SECTION_META[sectionKey];
  return (
    <div
      id={id}
      className={classes.section}
      style={{
        ['--sec-base' as string]: `var(--saa-${sectionKey}-base)`,
        ['--sec-bar' as string]: `var(--saa-${sectionKey}-bar)`,
        ['--sec-text' as string]: `var(--saa-${sectionKey}-text)`,
      }}
    >
      <div className={classes.sectionHead}>
        <div className={classes.sectionLeft}>
          {icon && <div className={classes.sectionLogo}>{icon}</div>}
          <div>
            <div className={classes.sectionName}>{name ?? m.name}</div>
            <div className={classes.sectionMeta}>{meta ?? m.meta}</div>
          </div>
        </div>
        {actions && <div className={`${classes.sectionBtns} saa-no-print`}>{actions}</div>}
      </div>
      {children}
    </div>
  );
}

export function Hero({ title, sub, right }: { title: ReactNode; sub?: ReactNode; right?: ReactNode }) {
  return (
    <div className={classes.hero}>
      <div className={classes.heroGlow} />
      <div>
        <div className={classes.heroTitle}>{title}</div>
        {sub && <div className={classes.heroSub}>{sub}</div>}
      </div>
      {right && <div style={{ position: 'relative', zIndex: 1 }}>{right}</div>}
    </div>
  );
}
