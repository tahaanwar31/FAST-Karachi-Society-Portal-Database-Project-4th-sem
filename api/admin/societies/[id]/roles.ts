import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db, initDb } from '../../../_lib/db';
import { requireAdmin } from '../../../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'PATCH') return res.status(405).end();
  const user = await requireAdmin(req, res);
  if (!user) return;
  await initDb();

  const { head_id, co_head_id } = req.body;
  const { id } = req.query;

  if (head_id !== undefined) {
    await db.prepare('UPDATE societies SET head_id = ? WHERE id = ?').run(head_id, id);
    if (head_id) await db.prepare("UPDATE users SET role = 'SOCIETY_HEAD' WHERE id = ?").run(head_id);
  }
  if (co_head_id !== undefined) {
    await db.prepare('UPDATE societies SET co_head_id = ? WHERE id = ?').run(co_head_id, id);
  }
  res.json({ success: true });
}
