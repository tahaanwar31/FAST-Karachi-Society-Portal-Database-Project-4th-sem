import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db, initDb } from '../_lib/db';
import { requireAdmin } from '../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = await requireAdmin(req, res);
  if (!user) return;
  await initDb();
  const members = await db.prepare(`
    SELECT sm.id, sm.name, sm.email, sm.society_id, sm.roll_no, sm.department, sm.semester, sm.phone, sm.joined_date, sm.created_at, s.name as society_name
    FROM student_members sm
    LEFT JOIN societies s ON sm.society_id = s.id
  `).all();
  res.json(members);
}
