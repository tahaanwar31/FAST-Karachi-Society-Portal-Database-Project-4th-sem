import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db, initDb } from '../_lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await initDb();
  const societies = await db.prepare(`
    SELECT s.*, u1.name as head_name, u2.name as co_head_name
    FROM societies s
    LEFT JOIN users u1 ON s.head_id = u1.id
    LEFT JOIN users u2 ON s.co_head_id = u2.id
  `).all();
  res.json(societies);
}
