import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db, initDb } from '../_lib/db';
import { requireHead } from '../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).end();
  const user = await requireHead(req, res);
  if (!user) return;

  await initDb();
  const events = await db.prepare(`
    SELECT e.*, v.name as venue_name,
      (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id AND r.status = 'REGISTERED') as reg_count
    FROM events e
    JOIN societies s ON e.society_id = s.id
    JOIN venues v ON e.venue_id = v.id
    WHERE s.head_id = ?
  `).all(user.id);
  res.json(events);
}
