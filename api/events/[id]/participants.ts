import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db, initDb } from '../../_lib/db';
import { requireAuth } from '../../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).end();
  const user = await requireAuth(req, res);
  if (!user) return;

  await initDb();
  const participants = await db.prepare(`
    SELECT u.id, u.name, u.email, u.roll_no, u.phone
    FROM registrations r
    JOIN users u ON r.user_id = u.id
    WHERE r.event_id = ? AND r.status = 'REGISTERED'
  `).all(req.query.id);
  res.json(participants);
}
