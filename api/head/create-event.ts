import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db, initDb } from '../_lib/db';
import { requireHead } from '../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const user = await requireHead(req, res);
  if (!user) return;

  await initDb();
  const { title, description, date, time, capacity, venue_id } = req.body;
  const society = await db.prepare('SELECT id FROM societies WHERE head_id = ?').get(user.id);
  if (!society) return res.status(400).json({ error: 'No society found' });
  const id = Math.random().toString(36).substring(2, 11);
  await db.prepare('INSERT INTO events (id, title, description, date, time, capacity, society_id, venue_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id, title, description, date, time, capacity, society.id, venue_id);
  res.json({ success: true, id });
}
