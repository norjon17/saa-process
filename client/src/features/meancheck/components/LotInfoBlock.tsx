import { Text } from '@mantine/core';
import { memo } from 'react';

import { ShiftPill, VerdictPill } from '@/components/ui/StatusPill';
import { formatLongDate } from '@/lib/time';

import { TOTAL_CHECKS, type LotView } from '../model';
import classes from './meancheck.module.css';

function Item({ label, value, wide }: { label: string; value: React.ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? `${classes.infoItem} ${classes.infoWide}` : classes.infoItem}>
      <div className={classes.infoLabel}>{label}</div>
      <div className={classes.infoValue}>{value ?? '—'}</div>
    </div>
  );
}

/** Excel "Summary" sheet header: lot identity on the left, Over-all Judgment on the right. */
export const LotInfoBlock = memo(function LotInfoBlock({ view }: { view: LotView }) {
  const passedCount = TOTAL_CHECKS - view.failCount;
  const color = view.verdict === 'passed' ? '#00c000' : '#e53935';
  return (
    <div className={classes.infoGrid}>
      <div>
        <div className={classes.blockTitle}>Lot information</div>
        <div className={classes.infoList}>
          <Item label="Lot number" value={view.lotNo} wide />
          <Item label="Tester ID" value={view.toolCode} />
          <Item label="SAT tester" value={view.satTester} />
          <Item label="Model" value={view.modelCode} />
          <Item label="Head type" value={view.headType} />
          <Item label="Suspension" value={view.suspension} />
          <Item label="Date" value={formatLongDate(view.mcDate)} />
          <Item label="Shift" value={view.shift ? <ShiftPill shift={view.shift} /> : '—'} />
          <Item label="Operator ID" value={view.operatorId} />
          <Item label="Region" value={view.region} />
          <Item label="Program lot" value={view.programLotName} wide />
          <Item label="Engine" value={`v${view.engineVersion}`} />
        </div>
      </div>
      <div className={classes.judgment} style={{ ['--jdg-color' as string]: color }}>
        <div className={classes.judgmentTitle}>Over-all judgment</div>
        <VerdictPill verdict={view.verdict} size="lg" />
        <div className={classes.judgmentSub}>
          {passedCount}/{TOTAL_CHECKS} checks passed
        </div>
        {view.failCount > 0 && (
          <Text size="xs" c="red" fw={700}>
            {view.failCount} failed
          </Text>
        )}
      </div>
    </div>
  );
});
