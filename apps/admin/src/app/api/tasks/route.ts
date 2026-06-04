import { NextResponse } from 'next/server';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const TASKS_FILE = join(process.cwd(), '..', '..', 'tasks-status.json');

// Shared secret gate. Without ADMIN_TASKS_TOKEN env, PATCH is fully disabled.
// The admin UI sends it via NEXT_PUBLIC_… → header (or proxies through the API).
function isAuthorized(req: Request): boolean {
  const expected = process.env.ADMIN_TASKS_TOKEN;
  if (!expected) return false;
  const got = req.headers.get('x-admin-tasks-token');
  return !!got && got === expected;
}

const ALLOWED_STATUSES = new Set(['pending', 'in_progress', 'completed', 'blocked']);

export async function GET() {
  try {
    const raw = readFileSync(TASKS_FILE, 'utf-8');
    const data = JSON.parse(raw);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Could not read tasks file' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { taskId, status } = await req.json();
    if (typeof taskId !== 'number' || typeof status !== 'string' || !ALLOWED_STATUSES.has(status)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }
    const raw = readFileSync(TASKS_FILE, 'utf-8');
    const data = JSON.parse(raw);

    const task = data.tasks.find((t: { id: number }) => t.id === taskId);
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    task.status = status;
    data.lastUpdated = new Date().toISOString();

    writeFileSync(TASKS_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return NextResponse.json({ success: true, task });
  } catch {
    return NextResponse.json({ error: 'Could not update task' }, { status: 500 });
  }
}
