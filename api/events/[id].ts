import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db, initDb } from '../_lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await initDb();
  if (req.method === 'GET') {
    const event = await db.prepare(`
      SELECT e.*, s.name as society_name, v.name as venue_name, v.location as venue_location
      FROM events e
      JOIN societies s ON e.society_id = s.id
      JOIN venues v ON e.venue_id = v.id
      WHERE e.id = ?
    `).get(req.query.id);
    return res.json(event);
  }

  if (req.method === 'POST' && req.url?.includes('/register')) {
    const cookieHeader = req.headers.cookie || '';
    const match = cookieHeader.match(/userId=([^;]+)/);
    if (!match) return res.status(401).json({ error: 'Unauthorized' });
    const user = await db.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(match[1]);
    if (!user) return res.status(401).json({ error: 'User not found' });

    const eventId = req.query.id as string;
    const existing = await db.prepare('SELECT * FROM registrations WHERE user_id = ? AND event_id = ?').get(user.id, eventId);
    if (existing) return res.status(400).json({ error: 'Already registered' });
    const id = Math.random().toString(36).substring(2, 11);
    await db.prepare('INSERT INTO registrations (id, user_id, event_id) VALUES (?, ?, ?)').run(id, user.id, eventId);
    return res.json({ success: true });
  }

  res.status(405).end();
}
