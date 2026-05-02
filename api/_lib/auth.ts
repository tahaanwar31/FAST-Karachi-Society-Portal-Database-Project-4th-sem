import { VercelRequest, VercelResponse } from '@vercel/node';
import { db, initDb } from './db';

export async function getUser(req: VercelRequest) {
  await initDb();
  const cookieHeader = req.headers.cookie || '';
  const match = cookieHeader.match(/userId=([^;]+)/);
  if (!match) return null;
  return await db.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(match[1]);
}

export async function requireAuth(req: VercelRequest, res: VercelResponse) {
  const user = await getUser(req);
  if (!user) { res.status(401).json({ error: 'Unauthorized' }); return null; }
  return user;
}

export async function requireAdmin(req: VercelRequest, res: VercelResponse) {
  const user = await requireAuth(req, res);
  if (!user) return null;
  if (user.role !== 'ADMIN') { res.status(403).json({ error: 'Forbidden' }); return null; }
  return user;
}

export async function requireHead(req: VercelRequest, res: VercelResponse) {
  const user = await requireAuth(req, res);
  if (!user) return null;
  if (user.role !== 'SOCIETY_HEAD') { res.status(403).json({ error: 'Forbidden' }); return null; }
  return user;
}

export function setCookie(res: VercelResponse, name: string, value: string, maxAge = 30 * 24 * 60 * 60 * 1000) {
  res.setHeader('Set-Cookie', `${name}=${value}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}`);
}

export function clearCookie(res: VercelResponse, name: string) {
  res.setHeader('Set-Cookie', `${name}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`);
}
