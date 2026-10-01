import type { CSSProperties } from 'react';

import type { EndorsementProgress, McCellStatus, McDailyOverall, McVerdict, Shift } from '@shared/domain';

import { CELL_COLORS, OVERALL_COLORS, SHIFT_COLORS } from '@/theme/colors';

import classes from './ui.module.css';

export function Pill({ children, style, className, title }: { children: React.ReactNode; style?: CSSProperties; className?: string; title?: string }) {
  return (
    <span className={`${classes.pill} ${className ?? ''}`} style={style} title={title}>
      {children}
    </span>
  );
}

export function ShiftPill({ shift }: { shift: Shift }) {
  return <Pill style={{ background: SHIFT_COLORS[shift].gradient, color: '#fff' }}>{shift}</Pill>;
}

const REMARK = {
  open: { bg: '#e2e8f0', fg: '#64748b', label: '-' },
  done: { bg: 'linear-gradient(135deg,#166534,#16a34a)', fg: '#fff', label: 'DONE' },
  ongoing: { bg: 'linear-gradient(135deg,#854d0e,#ca8a04)', fg: '#fef08a', label: 'Ongoing' },
} as const;

export function RemarkPill({ progress }: { progress: EndorsementProgress }) {
  const r = REMARK[progress];
  return <Pill style={{ background: r.bg, color: r.fg }}>{r.label}</Pill>;
}

export function VerdictPill({ verdict, size = 'sm' }: { verdict: McVerdict | 'ongoing' | null; size?: 'sm' | 'lg' }) {
  const map = {
    passed: { bg: '#00c000', fg: '#0b3d0b', label: 'PASSED' },
    failed: { bg: '#e53935', fg: '#fff', label: 'FAILED' },
    ongoing: { bg: '#ffff00', fg: '#5c4d00', label: 'ONGOING' },
  } as const;
  const v = verdict ? map[verdict] : { bg: '#e2e8f0', fg: '#64748b', label: '—' };
  return (
    <Pill style={{ background: v.bg, color: v.fg, fontSize: size === 'lg' ? '1rem' : undefined, padding: size === 'lg' ? '6px 16px' : undefined }}>
      {v.label}
    </Pill>
  );
}

export function PassFailPill({ passed }: { passed: boolean }) {
  return <Pill style={{ background: passed ? '#00c000' : '#ff0000', color: passed ? '#0b3d0b' : '#fff' }}>{passed ? 'Passed' : 'Failed'}</Pill>;
}

export function CellStatusPill({ status }: { status: McCellStatus | null }) {
  if (!status) return <Pill style={{ background: 'transparent', color: 'var(--saa-text3)' }}>·</Pill>;
  const c = CELL_COLORS[status];
  return <Pill style={{ background: c.bg, color: c.fg }}>{c.label}</Pill>;
}

export function OverallPill({ overall }: { overall: McDailyOverall }) {
  const c = OVERALL_COLORS[overall];
  return <Pill style={{ background: c.bg, color: c.fg }}>{c.label}</Pill>;
}
