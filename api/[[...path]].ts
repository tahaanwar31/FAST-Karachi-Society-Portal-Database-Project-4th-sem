import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db, initDb } from './_lib/db';
import { getUser, requireAuth, requireAdmin, requireHead, setCookie, clearCookie } from './_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const path = (req.url || '').replace(/^\/api/, '').replace(/\?.*$/, '').replace(/\/+$/, '');
  const method = req.method || 'GET';
  await initDb();

  try {
    // ── AUTH ──
    if (path === '/auth/login' && method === 'POST') {
      const { email, password } = req.body;
      const user = await db.prepare('SELECT * FROM users WHERE email = ? AND password = ?').get(email, password);
      if (!user) return res.status(401).json({ error: 'Invalid credentials' });
      setCookie(res, 'userId', user.id);
      return res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
    }

    if (path === '/auth/logout' && method === 'POST') {
      clearCookie(res, 'userId');
      return res.json({ success: true });
    }

    if (path === '/auth/me' && method === 'GET') {
      const user = await getUser(req);
      if (!user) return res.status(401).json({ error: 'Not logged in' });
      return res.json(user);
    }

    // ── EVENTS ──
    if (path === '/events' && method === 'GET') {
      const events = await db.prepare(`
        SELECT e.*, s.name as society_name, v.name as venue_name,
          (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id AND r.status = 'REGISTERED') as reg_count
        FROM events e
        JOIN societies s ON e.society_id = s.id
        JOIN venues v ON e.venue_id = v.id
        WHERE e.status = 'PUBLISHED'
        ORDER BY e.date DESC
      `).all();
      return res.json(events);
    }

    if (path === '/venues' && method === 'GET') {
      const venues = await db.prepare('SELECT * FROM venues').all();
      return res.json(venues);
    }

    if (path === '/societies' && method === 'GET') {
      const societies = await db.prepare(`
        SELECT s.*, h.name as head_name, ch.name as co_head_name
        FROM societies s
        LEFT JOIN users h ON s.head_id = h.id
        LEFT JOIN users ch ON s.co_head_id = ch.id
      `).all();
      return res.json(societies);
    }

    // ── EVENT BY ID ──
    const eventMatch = path.match(/^\/events\/([^/]+)$/);
    if (eventMatch && method === 'GET') {
      const event = await db.prepare(`
        SELECT e.*, s.name as society_name, v.name as venue_name,
          (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id AND r.status = 'REGISTERED') as reg_count
        FROM events e
        JOIN societies s ON e.society_id = s.id
        JOIN venues v ON e.venue_id = v.id
        WHERE e.id = ?
      `).get(eventMatch[1]);
      if (!event) return res.status(404).json({ error: 'Not found' });
      return res.json(event);
    }

    // ── EVENT REGISTER ──
    const registerMatch = path.match(/^\/events\/([^/]+)\/register$/);
    if (registerMatch && method === 'POST') {
      const user = await requireAuth(req, res);
      if (!user) return;
      const eventId = registerMatch[1];
      const existing = await db.prepare('SELECT * FROM registrations WHERE user_id = ? AND event_id = ?').get(user.id, eventId);
      if (existing) return res.status(400).json({ error: 'Already registered' });
      const id = Math.random().toString(36).substring(2, 11);
      await db.prepare('INSERT INTO registrations (id, user_id, event_id, status) VALUES (?, ?, ?, ?)').run(id, user.id, eventId, 'REGISTERED');
      return res.json({ success: true });
    }

    // ── EVENT PARTICIPANTS ──
    const participantsMatch = path.match(/^\/events\/([^/]+)\/participants$/);
    if (participantsMatch && method === 'GET') {
      const user = await requireAuth(req, res);
      if (!user) return;
      const participants = await db.prepare(`
        SELECT u.id, u.name, u.email, r.registered_at
        FROM registrations r
        JOIN users u ON r.user_id = u.id
        WHERE r.event_id = ? AND r.status = 'REGISTERED'
      `).all(participantsMatch[1]);
      return res.json(participants);
    }

    // ── MY REGISTRATIONS ──
    if (path === '/registrations/my' && method === 'GET') {
      const user = await requireAuth(req, res);
      if (!user) return;
      const regs = await db.prepare(`
        SELECT r.*, e.title, e.date, e.time, e.status as event_status
        FROM registrations r
        JOIN events e ON r.event_id = e.id
        WHERE r.user_id = ?
      `).all(user.id);
      return res.json(regs);
    }

    // ── HEAD: MY EVENTS ──
    if (path === '/head/my-events' && method === 'GET') {
      const user = await requireHead(req, res);
      if (!user) return;
      const events = await db.prepare(`
        SELECT e.*, v.name as venue_name,
          (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id AND r.status = 'REGISTERED') as reg_count
        FROM events e
        JOIN societies s ON e.society_id = s.id
        JOIN venues v ON e.venue_id = v.id
        WHERE s.head_id = ?
      `).all(user.id);
      return res.json(events);
    }

    // ── HEAD: CREATE EVENT ──
    if (path === '/head/create-event' && method === 'POST') {
      const user = await requireHead(req, res);
      if (!user) return;
      const { title, description, date, time, capacity, venue_id } = req.body;
      const society = await db.prepare('SELECT id FROM societies WHERE head_id = ?').get(user.id);
      if (!society) return res.status(400).json({ error: 'No society found' });
      const id = Math.random().toString(36).substring(2, 11);
      await db.prepare('INSERT INTO events (id, title, description, date, time, capacity, society_id, venue_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .run(id, title, description, date, time, capacity, society.id, venue_id);
      return res.json({ success: true, id });
    }

    // ── ADMIN: STATS ──
    if (path === '/admin/stats' && method === 'GET') {
      const user = await requireAdmin(req, res);
      if (!user) return;
      const [users, events, societies, registrations, pendingEvents, admins, heads, coHeads, members] = await Promise.all([
        db.prepare('SELECT COUNT(*) as count FROM users').get(),
        db.prepare('SELECT COUNT(*) as count FROM events').get(),
        db.prepare('SELECT COUNT(*) as count FROM societies').get(),
        db.prepare('SELECT COUNT(*) as count FROM registrations').get(),
        db.prepare("SELECT COUNT(*) as count FROM events WHERE status = 'PENDING'").get(),
        db.prepare('SELECT COUNT(*) as count FROM admins').get(),
        db.prepare('SELECT COUNT(*) as count FROM heads').get(),
        db.prepare('SELECT COUNT(*) as count FROM co_heads').get(),
        db.prepare('SELECT COUNT(*) as count FROM student_members').get(),
      ]);
      return res.json({
        users: parseInt(users.count), events: parseInt(events.count),
        societies: parseInt(societies.count), registrations: parseInt(registrations.count),
        pendingEvents: parseInt(pendingEvents.count), admins: parseInt(admins.count),
        heads: parseInt(heads.count), coHeads: parseInt(coHeads.count),
        studentMembers: parseInt(members.count),
      });
    }

    // ── ADMIN: USERS ──
    if (path === '/admin/users' && method === 'GET') {
      const user = await requireAdmin(req, res);
      if (!user) return;
      const users = await db.prepare('SELECT id, name, email, role, roll_no, phone FROM users').all();
      return res.json(users);
    }

    // ── ADMIN: PENDING EVENTS ──
    if (path === '/admin/pending-events' && method === 'GET') {
      const user = await requireAdmin(req, res);
      if (!user) return;
      const events = await db.prepare(`
        SELECT e.*, s.name as society_name, v.name as venue_name
        FROM events e
        JOIN societies s ON e.society_id = s.id
        JOIN venues v ON e.venue_id = v.id
        WHERE e.status = 'PENDING'
      `).all();
      return res.json(events);
    }

    // ── ADMIN: APPROVE EVENT ──
    const approveMatch = path.match(/^\/admin\/approve-event\/([^/]+)$/);
    if (approveMatch && method === 'POST') {
      const user = await requireAdmin(req, res);
      if (!user) return;
      await db.prepare("UPDATE events SET status = 'PUBLISHED' WHERE id = ?").run(approveMatch[1]);
      return res.json({ success: true });
    }

    // ── ADMIN: REJECT EVENT ──
    const rejectMatch = path.match(/^\/admin\/reject-event\/([^/]+)$/);
    if (rejectMatch && method === 'POST') {
      const user = await requireAdmin(req, res);
      if (!user) return;
      await db.prepare("UPDATE events SET status = 'REJECTED' WHERE id = ?").run(rejectMatch[1]);
      return res.json({ success: true });
    }

    // ── ADMIN: CREATE SOCIETY ──
    if (path === '/admin/societies' && method === 'POST') {
      const user = await requireAdmin(req, res);
      if (!user) return;
      const { name, description, category, contact_email } = req.body;
      const id = Math.random().toString(36).substring(2, 11);
      await db.prepare('INSERT INTO societies (id, name, description, category, contact_email) VALUES (?, ?, ?, ?, ?)')
        .run(id, name, description, category, contact_email);
      return res.json({ success: true, id });
    }

    // ── ADMIN: DELETE SOCIETY ──
    const societyDeleteMatch = path.match(/^\/admin\/societies\/([^/]+)$/);
    if (societyDeleteMatch && method === 'DELETE') {
      const user = await requireAdmin(req, res);
      if (!user) return;
      await db.prepare('DELETE FROM societies WHERE id = ?').run(societyDeleteMatch[1]);
      return res.json({ success: true });
    }

    // ── ADMIN: ASSIGN ROLES ──
    const rolesMatch = path.match(/^\/admin\/societies\/([^/]+)\/roles$/);
    if (rolesMatch && method === 'PATCH') {
      const user = await requireAdmin(req, res);
      if (!user) return;
      const { head_id, co_head_id } = req.body;
      const societyId = rolesMatch[1];
      if (head_id !== undefined) {
        await db.prepare('UPDATE societies SET head_id = ? WHERE id = ?').run(head_id || null, societyId);
      }
      if (co_head_id !== undefined) {
        await db.prepare('UPDATE societies SET co_head_id = ? WHERE id = ?').run(co_head_id || null, societyId);
      }
      return res.json({ success: true });
    }

    // ── ADMIN: SQL QUERY ──
    if (path === '/admin/query' && method === 'POST') {
      const user = await requireAdmin(req, res);
      if (!user) return;
      const { query } = req.body;
      const result = await db.prepare(query).all();
      return res.json(result);
    }

    // ── ADMIN: INSPECT DB ──
    if (path === '/admin/system/inspect' && method === 'GET') {
      const user = await requireAdmin(req, res);
      if (!user) return;
      const tables = await db.prepare("SELECT table_name as name FROM information_schema.tables WHERE table_schema = 'public'").all();
      const result: any = {};
      for (const table of tables) {
        result[table.name] = await db.prepare(`SELECT * FROM ${table.name}`).all();
      }
      return res.json(result);
    }

    // ── ADMIN: ADMINS TABLE ──
    if (path === '/admin/admins' && method === 'GET') {
      const user = await requireAdmin(req, res);
      if (!user) return;
      const admins = await db.prepare('SELECT id, name, email, department, access_level, phone, created_at FROM admins').all();
      return res.json(admins);
    }

    // ── ADMIN: HEADS TABLE ──
    if (path === '/admin/heads' && method === 'GET') {
      const user = await requireAdmin(req, res);
      if (!user) return;
      const heads = await db.prepare('SELECT h.*, s.name as society_name FROM heads h LEFT JOIN societies s ON h.society_id = s.id').all();
      return res.json(heads);
    }

    // ── ADMIN: CO-HEADS TABLE ──
    if (path === '/admin/co-heads' && method === 'GET') {
      const user = await requireAdmin(req, res);
      if (!user) return;
      const coHeads = await db.prepare('SELECT ch.*, s.name as society_name FROM co_heads ch LEFT JOIN societies s ON ch.society_id = s.id').all();
      return res.json(coHeads);
    }

    // ── ADMIN: STUDENT MEMBERS TABLE ──
    if (path === '/admin/student-members' && method === 'GET') {
      const user = await requireAdmin(req, res);
      if (!user) return;
      const members = await db.prepare(`
        SELECT sm.id, sm.name, sm.email, sm.society_id, sm.roll_no, sm.department, sm.semester, sm.phone, sm.joined_date, sm.created_at, s.name as society_name
        FROM student_members sm
        LEFT JOIN societies s ON sm.society_id = s.id
      `).all();
      return res.json(members);
    }

    return res.status(404).json({ error: 'Not found' });
  } catch (error: any) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
