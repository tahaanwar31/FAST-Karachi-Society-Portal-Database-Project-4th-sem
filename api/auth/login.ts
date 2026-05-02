import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db, initDb } from '../_lib/db';
import { setCookie } from '../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  await initDb();
  const { email, password } = req.body;
  const user = await db.prepare('SELECT * FROM users WHERE email = ? AND password = ?').get(email, password);
  if (user) {
    setCookie(res, 'userId', user.id);
    const { password: _, ...userWithoutPass } = user;
    res.json(userWithoutPass);
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
}
