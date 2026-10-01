import type { ReactNode } from 'react';

import { Hero } from '@/components/ui/SectionCard';
import { useIsMobile } from '@/lib/useIsMobile';

import classes from './meancheck.module.css';

/** The navy "Meancheck Dashboard" banner from the original HTML dashboard. */
export function MeancheckHero({ right, sub }: { right?: ReactNode; sub?: ReactNode }) {
  // Phones: the page header already carries the same actions — keep the banner short.
  const isMobile = useIsMobile();
  return (
    <div className={`${classes.card} saa-no-print`} style={{ marginBottom: 14 }}>
      <Hero
        title={
          <>
            Meancheck <span className="saa-gradient-text">Dashboard</span>
          </>
        }
        sub={sub ?? 'First Daily Mean Check Results · LUZON & MINDANAO Regions'}
        right={isMobile ? undefined : right}
      />
    </div>
  );
}
