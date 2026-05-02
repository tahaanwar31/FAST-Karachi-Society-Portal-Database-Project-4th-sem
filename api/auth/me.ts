import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db, initDb } from '../_lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await initDb();
  const cookieHeader = req.headers.cookie || '';
  const match = cookieHeader.match(/userId=([^;]+)/);
  if (!match) return res.json(null);
  const user = await db.prepare('SELECT id, name, email, role, roll_no, phone FROM users WHERE id = ?').get(match[1]);
  res.json(user || null);
}
