import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db, initDb } from '../_lib/db';
import { requireAdmin } from '../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = await requireAdmin(req, res);
  if (!user) return;
  await initDb();
  const events = await db.prepare("SELECT e.*, s.name as society_name FROM events e JOIN societies s ON e.society_id = s.id WHERE e.status = 'PENDING'").all();
  res.json(events);
}
