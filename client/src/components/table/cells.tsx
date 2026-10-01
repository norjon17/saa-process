import { Checkbox, Menu, MultiSelect, NumberInput, Select } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';

import { Pill } from '@/components/ui/StatusPill';

import type { CellEditor } from './types';

export interface EditorProps {
  editor: CellEditor;
  value: unknown;
  onCommit: (value: unknown) => void;
  disabled?: boolean;
  ariaLabel?: string;
  /** `card` (DataTable phone cards): bordered, left-aligned inputs instead of borderless centred table-cell editors. */
  layout?: 'cell' | 'card';
}

function useAutosize(ref: React.RefObject<HTMLTextAreaElement | null>, value: string) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [ref, value]);
}

function TextEditor({ value, onCommit, disabled, placeholder, ariaLabel }: { value: string; onCommit: (v: string) => void; disabled?: boolean; placeholder?: string; ariaLabel?: string }) {
  const [v, setV] = useState(value);
  const [seen, setSeen] = useState(value);
  if (seen !== value) {
    // prop changed (server refresh / optimistic rollback): resync local state during render
    setSeen(value);
    setV(value);
  }
  const commit = () => {
    if (v !== value) onCommit(v);
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
    if (e.key === 'Escape') {
      setV(value);
      (e.target as HTMLInputElement).blur();
    }
  };
  return (
    <input className="saa-cell-input" value={v} placeholder={placeholder ?? '—'} disabled={disabled} onChange={(e) => setV(e.target.value)} onBlur={commit} onKeyDown={onKey} aria-label={ariaLabel} />
  );
}

function TextAreaEditor({ value, onCommit, disabled, placeholder, ariaLabel }: { value: string; onCommit: (v: string) => void; disabled?: boolean; placeholder?: string; ariaLabel?: string }) {
  const [v, setV] = useState(value);
  const [seen, setSeen] = useState(value);
  if (seen !== value) {
    setSeen(value);
    setV(value);
  }
  const ref = useRef<HTMLTextAreaElement>(null);
  useAutosize(ref, v);
  const commit = () => {
    if (v !== value) onCommit(v);
  };
  return (
    <textarea
      ref={ref}
      className="saa-cell-input"
      rows={1}
      value={v}
      placeholder={placeholder ?? '—'}
      disabled={disabled}
      onChange={(e) => setV(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          setV(value);
          (e.target as HTMLTextAreaElement).blur();
        }
      }}
      aria-label={ariaLabel}
    />
  );
}

function PillSelect({ value, options, onCommit, disabled }: { value: string; options: { value: string; label: string; bg: string; fg: string }[]; onCommit: (v: string) => void; disabled?: boolean }) {
  const current = options.find((o) => o.value === value) ?? options[0]!;
  return (
    <Menu shadow="md" position="bottom" disabled={disabled} withinPortal>
      <Menu.Target>
        <button type="button" style={{ border: 'none', background: 'transparent', cursor: disabled ? 'default' : 'pointer', padding: 0, width: '100%' }} aria-label="Change value" disabled={disabled}>
          <Pill style={{ background: current.bg, color: current.fg, width: '100%' }}>{current.label}</Pill>
        </button>
      </Menu.Target>
      <Menu.Dropdown>
        {options.map((o) => (
          <Menu.Item key={o.value} onClick={() => onCommit(o.value)} leftSection={<span style={{ width: 10, height: 10, borderRadius: 3, background: o.bg, display: 'inline-block' }} />}>
            {o.label}
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
}

export function CellEditorView({ editor, value, onCommit, disabled, ariaLabel, layout = 'cell' }: EditorProps) {
  const card = layout === 'card';
  const variant = card ? 'default' : 'unstyled';
  const textAlign = card ? 'left' : 'center';
  switch (editor.kind) {
    case 'text':
      return <TextEditor value={String(value ?? '')} onCommit={onCommit} disabled={disabled} placeholder={editor.placeholder} ariaLabel={ariaLabel} />;
    case 'textarea':
      return <TextAreaEditor value={String(value ?? '')} onCommit={onCommit} disabled={disabled} placeholder={editor.placeholder} ariaLabel={ariaLabel} />;
    case 'number':
      return (
        <NumberInput
          size="xs"
          variant={variant}
          value={typeof value === 'number' ? value : ''}
          step={editor.step}
          decimalScale={editor.precision}
          min={editor.min}
          max={editor.max}
          disabled={disabled}
          hideControls
          onBlur={(e) => {
            const raw = e.currentTarget.value;
            const n = raw === '' ? null : Number(raw);
            if (n !== value && (n === null || Number.isFinite(n))) onCommit(n);
          }}
          aria-label={ariaLabel}
          styles={{ input: { textAlign, fontSize: '0.78rem' } }}
        />
      );
    case 'date':
      return (
        <DateInput
          size="xs"
          variant={variant}
          value={typeof value === 'string' && value ? value : null}
          valueFormat="YYYY-MM-DD"
          onChange={(d) => {
            if (d && d !== value) onCommit(String(d).slice(0, 10));
          }}
          disabled={disabled}
          aria-label={ariaLabel}
          styles={{ input: { textAlign, fontSize: '0.72rem' } }}
        />
      );
    case 'checkbox':
      return <Checkbox size="xs" checked={!!value} disabled={disabled} onChange={(e) => onCommit(e.currentTarget.checked)} aria-label={ariaLabel} style={{ display: 'flex', justifyContent: card ? 'flex-start' : 'center' }} />;
    case 'select':
      return (
        <Select
          size="xs"
          variant={variant}
          data={editor.options()}
          value={value === null || value === undefined ? null : String(value)}
          onChange={(v) => onCommit(v)}
          clearable={editor.clearable ?? false}
          searchable
          disabled={disabled}
          comboboxProps={{ withinPortal: true }}
          aria-label={ariaLabel}
          styles={{ input: { fontSize: '0.74rem', fontWeight: 700, textAlign } }}
        />
      );
    case 'pill':
      return <PillSelect value={String(value ?? '')} options={editor.options()} onCommit={onCommit} disabled={disabled} />;
    case 'multiselect':
      return (
        <MultiSelect
          size="xs"
          variant={variant}
          data={editor.options()}
          value={Array.isArray(value) ? value.map(String) : []}
          onChange={(v) => onCommit(v)}
          maxValues={editor.max}
          searchable
          disabled={disabled}
          comboboxProps={{ withinPortal: true }}
          aria-label={ariaLabel}
          styles={{ input: { fontSize: '0.72rem' }, pill: { fontWeight: 700 } }}
        />
      );
  }
}
