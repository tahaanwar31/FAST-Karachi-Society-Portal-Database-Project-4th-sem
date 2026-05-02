import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db, initDb } from '../_lib/db';
import { requireAdmin } from '../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = await requireAdmin(req, res);
  if (!user) return;
  await initDb();
  const coHeads = await db.prepare('SELECT ch.*, s.name as society_name FROM co_heads ch LEFT JOIN societies s ON ch.society_id = s.id').all();
  res.json(coHeads);
}
