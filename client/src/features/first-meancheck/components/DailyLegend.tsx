import { Text } from '@mantine/core';

import { MC_CELL_STATUSES, MC_DAILY_OVERALLS } from '@shared/domain';

import { CELL_COLORS, OVERALL_COLORS } from '@/theme/colors';

function Swatch({ bg, label }: { bg: string; label: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.62rem', fontWeight: 700, color: 'var(--saa-text2)' }}>
      <span style={{ width: 12, height: 12, borderRadius: 3, background: bg, border: '1px solid rgba(0,0,0,.15)', display: 'inline-block' }} />
      {label}
    </span>
  );
}

/** Cell statuses (editable) and derived overall values. */
export function DailyLegend() {
  return (
    <span style={{ display: 'inline-flex', columnGap: 16, rowGap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
      {/* Each group wraps as a unit, so on a phone "Cells" and "Overall" get a line each. */}
      <span style={{ display: 'inline-flex', gap: '4px 10px', flexWrap: 'wrap', alignItems: 'center' }}>
        <Text size="xs" c="dimmed" fw={700}>
          Cells:
        </Text>
        {MC_CELL_STATUSES.map((k) => (
          <Swatch key={k} bg={CELL_COLORS[k].bg} label={CELL_COLORS[k].label} />
        ))}
      </span>
      <span style={{ display: 'inline-flex', gap: '4px 10px', flexWrap: 'wrap', alignItems: 'center' }}>
        <Text size="xs" c="dimmed" fw={700}>
          Overall:
        </Text>
        {MC_DAILY_OVERALLS.map((k) => (
          <Swatch key={k} bg={OVERALL_COLORS[k].bg} label={OVERALL_COLORS[k].label} />
        ))}
      </span>
    </span>
  );
}
