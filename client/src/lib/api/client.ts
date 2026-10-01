export class ApiError extends Error {
  override readonly name = 'ApiError';
  readonly status: number;
  readonly code: string;
  readonly details: unknown;
  readonly problems: string[] | undefined;
  constructor(status: number, code: string, message: string, details?: unknown, problems?: string[]) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
    this.problems = problems;
  }
}

let onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (fn: () => void) => {
  onUnauthorized = fn;
};

export type Query = Record<string, string | number | boolean | null | undefined>;

export function buildUrl(path: string, query?: Query): string {
  if (!query) return path;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === '') continue;
    params.set(k, String(v));
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

async function request<T>(method: string, path: string, opts: { query?: Query; body?: unknown; form?: FormData } = {}): Promise<T> {
  const res = await fetch(buildUrl(path, opts.query), {
    method,
    credentials: 'same-origin',
    headers: opts.form ? undefined : opts.body !== undefined ? { 'content-type': 'application/json' } : undefined,
    body: opts.form ?? (opts.body !== undefined ? JSON.stringify(opts.body) : undefined),
  });
  if (res.status === 401 && !path.startsWith('/api/auth/')) onUnauthorized?.();
  const text = await res.text();
  const data = text ? (JSON.parse(text) as unknown) : null;
  if (!res.ok) {
    const e = (data ?? {}) as { error?: string; message?: string; details?: unknown; problems?: string[]; issues?: unknown };
    throw new ApiError(res.status, e.error ?? 'HTTP_ERROR', e.message ?? res.statusText, e.details ?? e.issues, e.problems);
  }
  return data as T;
}

export const api = {
  get: <T>(path: string, query?: Query) => request<T>('GET', path, { query }),
  post: <T>(path: string, body?: unknown, query?: Query) => request<T>('POST', path, { body, query }),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, { body }),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, { body }),
  del: <T>(path: string) => request<T>('DELETE', path),
  upload: <T>(path: string, form: FormData, query?: Query) => request<T>('POST', path, { form, query }),
};
