import { Select } from '@mantine/core';
import { IconExternalLink } from '@tabler/icons-react';
import { Link } from '@tanstack/react-router';

import { useIsMobile } from '@/lib/useIsMobile';

import classes from '../endorsement.module.css';

export interface ToolSelectCellProps {
  value: string | null;
  toolId: number | null;
  options: { value: string; label: string }[];
  onChange: (toolId: number | null) => void;
}

/** Board Tool cell: an inline select plus a link to the tool drilldown. */
export function ToolSelectCell({ value, toolId, options, onChange }: ToolSelectCellProps) {
  // Phones: the cell is the card heading — a visible box with a placeholder, wide enough to tap.
  const isMobile = useIsMobile();
  return (
    <div className={classes.toolCell}>
      <Select
        size="xs"
        variant={isMobile ? 'default' : 'unstyled'}
        placeholder={isMobile ? 'Tool…' : undefined}
        w={isMobile ? 118 : undefined}
        data={options}
        value={value}
        onChange={(v) => {
          if (v !== value) onChange(v ? Number(v) : null);
        }}
        searchable
        clearable
        rightSection={<span />}
        rightSectionWidth={0}
        comboboxProps={{ withinPortal: true }}
        aria-label="Tool"
        styles={{ input: isMobile ? { fontSize: '0.86rem', fontWeight: 800, paddingInline: 8 } : { fontSize: '0.74rem', fontWeight: 700, textAlign: 'center', paddingInline: 2 } }}
      />
      {toolId !== null && (
        <Link to="/endorsement/tools/$toolId" params={{ toolId: String(toolId) }} className={classes.toolLink} aria-label="Open tool" title="Open tool">
          <IconExternalLink size={isMobile ? 16 : 12} />
        </Link>
      )}
    </div>
  );
}
