/**
 * Tiny test runner helpers — no external test framework.
 *
 * Why no jest/supertest? The project standard is "no new packages unless
 * strictly necessary". Node 20+ has native `fetch`, and ts-node is already
 * in the API's devDeps for the seed scripts. That's all we need.
 */

export const API_BASE = process.env.JMART_API_BASE || 'http://localhost:3000/api/v1';

export interface TestResult {
  name: string;
  pass: boolean;
  ms: number;
  error?: string;
}

const results: TestResult[] = [];

/**
 * Run a single scenario. Catches any throw and records pass/fail.
 * Scenarios are run sequentially so later ones can rely on artefacts
 * created by earlier ones (e.g. a lot ID flowing into create-order).
 */
export async function test(name: string, fn: () => Promise<void>): Promise<void> {
  const start = Date.now();
  try {
    await fn();
    const ms = Date.now() - start;
    results.push({ name, pass: true, ms });
    // eslint-disable-next-line no-console
    console.log(`  [32m✓[0m ${name} [90m(${ms}ms)[0m`);
  } catch (e) {
    const ms = Date.now() - start;
    const msg = e instanceof Error ? e.message : String(e);
    results.push({ name, pass: false, ms, error: msg });
    // eslint-disable-next-line no-console
    console.log(`  [31m✗[0m ${name} [90m(${ms}ms)[0m\n    [31m${msg}[0m`);
  }
}

export function summarize(): { pass: number; fail: number; total: number; results: TestResult[] } {
  const pass = results.filter((r) => r.pass).length;
  const fail = results.length - pass;
  return { pass, fail, total: results.length, results };
}

/* ── Assertion helpers ───────────────────────────────────────────── */

export function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`assertion failed: ${msg}`);
}

export function assertEq<T>(actual: T, expected: T, msg: string): void {
  if (actual !== expected) {
    throw new Error(`${msg}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

/* ── HTTP helpers (auth-aware) ───────────────────────────────────── */

export interface ApiOpts {
  token?: string;
  expect?: number; // expected HTTP status (default 2xx accepted)
}

async function call<T = unknown>(
  method: string,
  path: string,
  body: unknown,
  opts: ApiOpts = {},
): Promise<{ status: number; data: T }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  const res = await fetch(API_BASE + path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data: any;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (opts.expect !== undefined) {
    if (res.status !== opts.expect) {
      throw new Error(`HTTP ${method} ${path} expected ${opts.expect}, got ${res.status}: ${text.slice(0, 200)}`);
    }
  } else if (res.status >= 400) {
    throw new Error(`HTTP ${method} ${path} → ${res.status}: ${text.slice(0, 200)}`);
  }
  return { status: res.status, data: data as T };
}

export const api = {
  get:    <T = any>(path: string, opts?: ApiOpts) => call<T>('GET',    path, undefined, opts),
  post:   <T = any>(path: string, body?: unknown, opts?: ApiOpts) => call<T>('POST',   path, body, opts),
  patch:  <T = any>(path: string, body?: unknown, opts?: ApiOpts) => call<T>('PATCH',  path, body, opts),
  delete: <T = any>(path: string, opts?: ApiOpts) => call<T>('DELETE', path, undefined, opts),
};

/* ── Domain helpers ──────────────────────────────────────────────── */

export async function login(email: string, password: string): Promise<{ token: string; user: any; refreshToken?: string }> {
  const { data } = await api.post<{ data: { accessToken: string; refreshToken?: string; user: any } }>(
    '/auth/login',
    { email, password },
    { expect: 200 },
  );
  if (!data?.data?.accessToken) throw new Error('login: no accessToken in response');
  return { token: data.data.accessToken, refreshToken: data.data.refreshToken, user: data.data.user };
}
