import type { SectionKey, Shift } from '@shared/domain';
import { SECTION_KEYS, SECTION_META } from '@shared/domain';

import type { BoardKpi, Endorsement } from '@/lib/api/types';
import { formatLongDate, weekdayOf } from '@/lib/time';

import { asSectionKey } from '../sections';

/** Some mail apps / browsers / Windows shell handlers cut `mailto:` URLs at ~2000 chars; keep a margin. */
export const MAILTO_MAX = 1800;

export const defaultSubject = (date: string, shift: Shift) => `SAA Process Endorsement — ${formatLongDate(date)} ${shift}`;

const EMAIL_RE = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;

/** "a@x.com, b@y.com; c@z.com" → trimmed list (commas or semicolons, as Outlook users type them). */
export const parseAddresses = (s: string): string[] =>
  s
    .split(/[,;]/)
    .map((a) => a.trim())
    .filter(Boolean);

export const invalidAddresses = (s: string): string[] => parseAddresses(s).filter((a) => !EMAIL_RE.test(a));

const clip = (s: string, n: number) => {
  const t = s.replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t;
};

/** Issue order: ongoing first (the next shift must follow up), then open; section order, then board order (stable sort). */
const issueRank = (r: Endorsement) => (r.progress === 'ongoing' ? 0 : 10) + SECTION_KEYS.indexOf(asSectionKey(r.sectionKey));

const encodeAddresses = (s: string) =>
  parseAddresses(s)
    .map((a) => encodeURIComponent(a).replace(/%40/g, '@'))
    .join(',');

/** RFC 6068: line breaks in a mailto body are CRLF, percent-encoded. */
const encodeText = (s: string) => encodeURIComponent(s.replace(/\r?\n/g, '\r\n'));

export function buildMailto(to: string, cc: string, subject: string, body: string): string {
  const params = [cc.trim() ? `cc=${encodeAddresses(cc)}` : null, `subject=${encodeText(subject)}`, `body=${encodeText(body)}`].filter(Boolean);
  return `mailto:${encodeAddresses(to)}?${params.join('&')}`;
}

export interface ComposeInput {
  to: string;
  cc: string;
  subject: string;
  message: string;
  date: string;
  shift: Shift;
  items: Endorsement[];
  kpi: Record<SectionKey, BoardKpi>;
  /** Link back to this shift's board, appended at the end. */
  link?: string;
  maxLength?: number;
}

export interface ComposedEmail {
  /** Auto summary exactly as it goes into the body (after truncation). */
  summary: string;
  body: string;
  url: string;
  /** Open + ongoing issues listed / existing. */
  shownIssues: number;
  totalIssues: number;
  /** True when even the shortest summary leaves the URL over the limit (the user's own message is too long). */
  overLimit: boolean;
}

/**
 * Plain-text body: the user's message, then per-section counts and the open/ongoing issues (tool + issue). Issues are
 * dropped from the end until the whole `mailto:` URL fits `maxLength`; the picture carries the full detail.
 */
export function composeEmail(input: ComposeInput): ComposedEmail {
  const { date, shift, kpi, items } = input;
  const max = input.maxLength ?? MAILTO_MAX;
  const total = SECTION_KEYS.reduce((t, k) => ({ rows: t.rows + kpi[k].total, done: t.done + kpi[k].done, ongoing: t.ongoing + kpi[k].ongoing, open: t.open + kpi[k].open }), {
    rows: 0,
    done: 0,
    ongoing: 0,
    open: 0,
  });

  const head = [
    `SHIFT SUMMARY - ${weekdayOf(date)}, ${formatLongDate(date)} - ${shift} (${shift === 'DS' ? 'Day' : 'Night'} shift)`,
    `Total ${total.rows} rows | ${total.done} done | ${total.ongoing} ongoing | ${total.open} open`,
    '',
    'Per section (rows / done / ongoing):',
    ...SECTION_KEYS.map((k) => `- ${SECTION_META[k].name}: ${kpi[k].total} / ${kpi[k].done} / ${kpi[k].ongoing}`),
  ];

  const pending = items.filter((r) => !r.isNone && r.progress !== 'done').toSorted((a, b) => issueRank(a) - issueRank(b));
  const issues = pending.map((r) => {
    const text = clip(r.issue || r.actionStatus || '(no issue text)', 70);
    return `- [${r.progress === 'ongoing' ? 'Ongoing' : 'Open'}] ${r.tool?.code ?? 'No tool'} (${SECTION_META[asSectionKey(r.sectionKey)].name}): ${text}`;
  });
  const tail = input.link ? ['', `Board: ${input.link}`] : [];
  const message = input.message.trim();

  const assemble = (n: number) => {
    const lines = [...head];
    if (issues.length) {
      lines.push('', `Open / ongoing issues (${issues.length}):`, ...issues.slice(0, n));
      if (n < issues.length) lines.push(`- ... and ${issues.length - n} more - see the board picture`);
    }
    lines.push(...tail);
    const summary = lines.join('\n');
    const body = message ? `${message}\n\n${summary}` : summary;
    return { summary, body, url: buildMailto(input.to, input.cc, input.subject, body) };
  };

  for (let n = issues.length; n >= 0; n--) {
    const c = assemble(n);
    if (c.url.length <= max) return { ...c, shownIssues: n, totalIssues: issues.length, overLimit: false };
  }
  return { ...assemble(0), shownIssues: 0, totalIssues: issues.length, overLimit: true };
}
