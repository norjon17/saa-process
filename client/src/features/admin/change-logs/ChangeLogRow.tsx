import { Badge } from '@mantine/core';
import { memo } from 'react';

import type { AuditAction, AuditEntity, AuditLog } from '@/lib/api/types';
import { formatDateTime, timeAgo } from '@/lib/time';

import classes from './change-logs.module.css';

const ACTION_COLOR: Record<AuditAction, string> = {
  create: 'teal',
  update: 'blue',
  activate: 'green',
  deactivate: 'orange',
  delete: 'red',
};

const ENTITY_LABEL: Record<AuditEntity, string> = {
  user: 'User',
  user_alias: 'Aliases',
  tool: 'Tool',
  region: 'Region',
  model: 'Model',
  category: 'Category',
};

const FIELD_LABEL: Record<string, string> = {
  idNo: 'ID no',
  isActive: 'active',
  regionId: 'region',
  eeUserId: 'EE in charge',
  toolType: 'type',
  sortOrder: 'sort order',
  sectionKey: 'section',
  pitchTarget: 'pitch target',
  rollTarget: 'roll target',
  deltaSatLimit: 'Δ SAT limit',
  deltaTargetLimit: 'Δ target limit',
  sigmaLimit: 'sigma limit',
  cpkMin: 'Cpk min',
};

/** Turns ids stored in the log (regionId, eeUserId) into names; returns undefined when unknown. */
export type ValueResolver = (field: string, value: unknown) => string | undefined;

const MAX_LEN = 60;

function formatValue(field: string, value: unknown, resolve?: ValueResolver): string {
  if (value === null || value === undefined) return '∅';
  const named = resolve?.(field, value);
  if (named !== undefined) return named;
  if (typeof value === 'string') return value === '' ? '""' : value;
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value)) return value.length ? value.map((v) => (typeof v === 'string' ? v : JSON.stringify(v))).join(', ') : '[]';
  return JSON.stringify(value);
}

function Value({ text, kind }: { text: string; kind: 'from' | 'to' }) {
  const long = text.length > MAX_LEN;
  return (
    <span className={kind === 'from' ? classes.from : classes.to} title={long ? text : undefined}>
      {long ? `${text.slice(0, MAX_LEN - 1)}…` : text}
    </span>
  );
}

/** One audit entry. Memoised: rows only re-render when their log object (or the resolver) changes. */
export const ChangeLogRow = memo(function ChangeLogRow({ log, resolve }: { log: AuditLog; resolve?: ValueResolver }) {
  const fields = Object.entries(log.changes);
  const isCreate = log.action === 'create';
  return (
    <div className={classes.row}>
      <div className={classes.head}>
        <Badge size="xs" variant="light" color={ACTION_COLOR[log.action]} className={classes.badge}>
          {log.action}
        </Badge>
        <span className={classes.label}>
          {log.entityLabel ?? `#${log.entityId}`}
          <span className={classes.kind}>{ENTITY_LABEL[log.entity]}</span>
        </span>
        <span className={classes.time} title={formatDateTime(log.createdAt)}>
          {timeAgo(log.createdAt)} · {formatDateTime(log.createdAt)}
        </span>
      </div>
      <div className={classes.actor}>by {log.actorName ?? 'unknown'}</div>
      {fields.length > 0 && (
        <ul className={classes.changes}>
          {fields.map(([field, { from, to }]) => (
            <li key={field} className={classes.change}>
              <span className={classes.field}>{FIELD_LABEL[field] ?? field}:</span>
              {isCreate ? (
                <Value text={formatValue(field, to, resolve)} kind="to" />
              ) : (
                <>
                  <Value text={formatValue(field, from, resolve)} kind="from" />
                  <span className={classes.arrow}>→</span>
                  <Value text={formatValue(field, to, resolve)} kind="to" />
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});
