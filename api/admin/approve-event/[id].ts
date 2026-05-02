import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db, initDb } from '../../_lib/db';
import { requireAdmin } from '../../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const user = await requireAdmin(req, res);
  if (!user) return;
  await initDb();
  await db.prepare("UPDATE events SET status = 'PUBLISHED' WHERE id = ?").run(req.query.id);
  res.json({ success: true });
}
