import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db, initDb } from '../_lib/db';
import { requireAuth } from '../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).end();
  const user = await requireAuth(req, res);
  if (!user) return;

  await initDb();
  const regs = await db.prepare("SELECT event_id FROM registrations WHERE user_id = ? AND status = 'REGISTERED'").all(user.id);
  res.json(regs.map((r: any) => r.event_id));
}
