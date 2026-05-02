import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db, initDb } from '../_lib/db';
import { requireAdmin } from '../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = await requireAdmin(req, res);
  if (!user) return;
  await initDb();
  const admins = await db.prepare('SELECT id, name, email, department, access_level, phone, created_at FROM admins').all();
  res.json(admins);
}
