import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db, initDb } from '../../_lib/db';
import { requireAuth } from '../../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const user = await requireAuth(req, res);
  if (!user) return;

  await initDb();
  const eventId = req.query.id as string;
  const existing = await db.prepare('SELECT * FROM registrations WHERE user_id = ? AND event_id = ?').get(user.id, eventId);
  if (existing) return res.status(400).json({ error: 'Already registered' });
  const id = Math.random().toString(36).substring(2, 11);
  await db.prepare('INSERT INTO registrations (id, user_id, event_id) VALUES (?, ?, ?)').run(id, user.id, eventId);
  res.json({ success: true });
}
