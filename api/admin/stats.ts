import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db, initDb } from '../_lib/db';
import { requireAdmin } from '../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = await requireAdmin(req, res);
  if (!user) return;
  await initDb();
  const stats = {
    societies: await db.prepare('SELECT count(*) as count FROM societies').get(),
    users: await db.prepare('SELECT count(*) as count FROM users').get(),
    events: await db.prepare('SELECT count(*) as count FROM events').get(),
    registrations: await db.prepare('SELECT count(*) as count FROM registrations').get(),
    admins: await db.prepare('SELECT count(*) as count FROM admins').get(),
    heads: await db.prepare('SELECT count(*) as count FROM heads').get(),
    co_heads: await db.prepare('SELECT count(*) as count FROM co_heads').get(),
    student_members: await db.prepare('SELECT count(*) as count FROM student_members').get(),
  };
  res.json(stats);
}
