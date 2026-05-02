import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db, initDb } from '../_lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await initDb();
  const events = await db.prepare(`
    SELECT e.*, s.name as society_name, v.name as venue_name, v.location as venue_location,
      (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id AND r.status = 'REGISTERED') as participant_count
    FROM events e
    JOIN societies s ON e.society_id = s.id
    JOIN venues v ON e.venue_id = v.id
    WHERE e.status = 'PUBLISHED'
    ORDER BY e.date ASC
  `).all();
  res.json(events);
}
