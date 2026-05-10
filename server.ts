import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import cookieParser from 'cookie-parser';

// Fix PostgreSQL bigint (COUNT*) returning strings instead of numbers
pg.types.setTypeParser(20, (val: string) => parseInt(val, 10));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Database Configuration ---
const isPostgres = !!process.env.DATABASE_URL;
let db: any;
let pgPool: pg.Pool | null = null;

if (isPostgres) {
  console.log('--- SYSTEM: Using Postgres (Option B) ---');
  console.log('--- SYSTEM: DATABASE_URL is present');
  pgPool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  pgPool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
  });

  // Convert SQLite ? placeholders to Postgres $1, $2, ... style
  const toPgSql = (sql: string) => {
    let idx = 0;
    return sql.replace(/\?/g, () => `$${++idx}`);
  };

  // Generic query wrapper for Postgres
  db = {
    prepare: (sql: string) => ({
      get: async (...params: any[]) => {
        try {
          const res = await pgPool!.query(toPgSql(sql), params);
          return res.rows[0];
        } catch (err) {
          console.error('DB Get Error:', sql, err);
          throw err;
        }
      },
      all: async (...params: any[]) => {
        try {
          const res = await pgPool!.query(toPgSql(sql), params);
          return res.rows;
        } catch (err) {
          console.error('DB All Error:', sql, err);
          throw err;
        }
      },
      run: async (...params: any[]) => {
        try {
          return await pgPool!.query(toPgSql(sql), params);
        } catch (err) {
          console.error('DB Run Error:', sql, err);
          throw err;
        }
      }
    }),
    exec: async (sql: string) => {
        const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);
        for (const stmt of statements) {
          await pgPool!.query(stmt);
        }
    }
  };
} else {
    console.log('--- SYSTEM: Using Local SQLite (Dev Mode) ---');
    let Database: any;
    try {
      Database = (await import('better-sqlite3')).default;
    } catch {
      console.error('--- SYSTEM: better-sqlite3 not available. Set DATABASE_URL in .env to use Postgres. ---');
      process.exit(1);
    }
    const sqlite = new Database('database.sqlite');
    sqlite.pragma('foreign_keys = ON');

    // Generic query wrapper for SQLite to match async interface
    db = {
      prepare: (sql: string) => ({
        get: async (...params: any[]) => sqlite.prepare(sql).get(...params),
        all: async (...params: any[]) => sqlite.prepare(sql).all(...params),
        run: async (...params: any[]) => sqlite.prepare(sql).run(...params)
      }),
      exec: async (sql: string) => sqlite.exec(sql)
    };
  }

// --- Schema Initialization ---
async function initDb() {
  // Nuclear: drop everything first so a fresh DB reset works cleanly
  const dropOrder = [
    'event_requests', 'feedback', 'registrations', 'events',
    'student_members', 'co_heads', 'heads', 'admins',
    'societies', 'venues', 'users'
  ];
  for (const t of dropOrder) {
    try { await db.exec(`DROP TABLE IF EXISTS ${t} CASCADE`); } catch { /* ignore */ }
  }
  console.log('--- DB: Old tables cleared ---');

  // Create tables one by one
  const tables = [
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'STUDENT',
      roll_no TEXT,
      phone TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS venues (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      location TEXT NOT NULL,
      capacity INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS societies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      category TEXT,
      established_year INTEGER,
      contact_email TEXT,
      vision TEXT,
      head_id TEXT,
      co_head_id TEXT,
      status TEXT DEFAULT 'APPROVED',
      admin_id TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      end_time TEXT,
      capacity INTEGER NOT NULL,
      society_id TEXT NOT NULL,
      venue_id TEXT NOT NULL,
      head_email TEXT,
      status TEXT NOT NULL DEFAULT 'PENDING',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS registrations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      event_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'REGISTERED',
      registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, event_id)
    )`,
    `CREATE TABLE IF NOT EXISTS admins (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      department TEXT,
      access_level TEXT DEFAULT 'FULL',
      phone TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS heads (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      society_id TEXT,
      department TEXT,
      phone TEXT,
      tenure_start TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS co_heads (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      society_id TEXT,
      department TEXT,
      phone TEXT,
      tenure_start TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS student_members (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      society_id TEXT,
      roll_no TEXT,
      department TEXT,
      semester INTEGER,
      phone TEXT,
      joined_date TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS feedback (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      event_id TEXT NOT NULL,
      rating INTEGER NOT NULL,
      comments TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, event_id)
    )`,
    `CREATE TABLE IF NOT EXISTS event_requests (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL,
      head_id TEXT NOT NULL,
      request_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      reason TEXT,
      admin_reason TEXT,
      proposed_title TEXT,
      proposed_description TEXT,
      proposed_date TEXT,
      proposed_time TEXT,
      proposed_end_time TEXT,
      proposed_capacity INTEGER,
      proposed_venue_id TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      resolved_at TIMESTAMP
    )`
  ];

  // Create tables one by one
  for (const sql of tables) {
    try {
      await db.exec(sql);
    } catch (err) {
      console.error('CREATE TABLE error:', err);
    }
  }
  console.log('--- DB: Tables created ---');

  // Add CHECK constraints (separate so they don't block table creation)
  if (isPostgres) {
    const checks = [
      "ALTER TABLE users ADD CONSTRAINT chk_users_role CHECK (role IN ('ADMIN', 'SOCIETY_HEAD', 'STUDENT'))",
      "ALTER TABLE venues ADD CONSTRAINT chk_venues_capacity CHECK (capacity > 0)",
      "ALTER TABLE societies ADD CONSTRAINT chk_societies_status CHECK (status IN ('APPROVED', 'PENDING', 'REJECTED'))",
      "ALTER TABLE societies ADD CONSTRAINT chk_societies_category CHECK (category IS NULL OR category IN ('TECHNICAL', 'CULTURAL', 'LITERARY', 'SPORTS', 'SOCIAL'))",
      "ALTER TABLE events ADD CONSTRAINT chk_events_status CHECK (status IN ('PENDING', 'PUBLISHED', 'CANCELLED'))",
      "ALTER TABLE events ADD CONSTRAINT chk_events_capacity CHECK (capacity > 0)",
      "ALTER TABLE registrations ADD CONSTRAINT chk_regs_status CHECK (status IN ('REGISTERED', 'ATTENDED', 'CANCELLED'))",
      "ALTER TABLE admins ADD CONSTRAINT chk_admins_access CHECK (access_level IN ('FULL', 'LIMITED'))",
      "ALTER TABLE feedback ADD CONSTRAINT chk_fb_rating CHECK (rating >= 1 AND rating <= 5)",
      "ALTER TABLE event_requests ADD CONSTRAINT chk_er_type CHECK (request_type IN ('UPDATE', 'DELETE'))",
      "ALTER TABLE event_requests ADD CONSTRAINT chk_er_status CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED'))",
    ];
    for (const sql of checks) {
      try { await db.exec(sql); } catch { /* already exists */ }
    }

    // Add FK constraints
    const fks = [
      "ALTER TABLE societies ADD CONSTRAINT fk_societies_head FOREIGN KEY (head_id) REFERENCES users(id) ON DELETE SET NULL",
      "ALTER TABLE societies ADD CONSTRAINT fk_societies_cohead FOREIGN KEY (co_head_id) REFERENCES users(id) ON DELETE SET NULL",
      "ALTER TABLE societies ADD CONSTRAINT fk_societies_admin FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE SET NULL",
      "ALTER TABLE events ADD CONSTRAINT fk_events_society FOREIGN KEY (society_id) REFERENCES societies(id) ON DELETE CASCADE",
      "ALTER TABLE events ADD CONSTRAINT fk_events_venue FOREIGN KEY (venue_id) REFERENCES venues(id) ON DELETE RESTRICT",
      "ALTER TABLE registrations ADD CONSTRAINT fk_regs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE",
      "ALTER TABLE registrations ADD CONSTRAINT fk_regs_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE",
      "ALTER TABLE feedback ADD CONSTRAINT fk_fb_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE",
      "ALTER TABLE feedback ADD CONSTRAINT fk_fb_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE",
      "ALTER TABLE event_requests ADD CONSTRAINT fk_er_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE",
      "ALTER TABLE event_requests ADD CONSTRAINT fk_er_head FOREIGN KEY (head_id) REFERENCES users(id) ON DELETE CASCADE",
      "ALTER TABLE heads ADD CONSTRAINT fk_heads_society FOREIGN KEY (society_id) REFERENCES societies(id) ON DELETE SET NULL",
      "ALTER TABLE co_heads ADD CONSTRAINT fk_coheads_society FOREIGN KEY (society_id) REFERENCES societies(id) ON DELETE SET NULL",
      "ALTER TABLE student_members ADD CONSTRAINT fk_sm_society FOREIGN KEY (society_id) REFERENCES societies(id) ON DELETE SET NULL",
    ];
    for (const sql of fks) {
      try { await db.exec(sql); } catch { /* already exists */ }
    }
    console.log('--- DB: Constraints applied ---');
  }

  // Seed data
  const userCheck = await db.prepare('SELECT count(*) as count FROM users').get() as any;
  const count = Number(userCheck?.count ?? userCheck?.COUNT ?? 0);
  console.log(`--- DB: User count = ${count} (raw: ${JSON.stringify(userCheck)}) ---`);

  if (count === 0) {
    console.log('Seeding initial data...');

    // --- Users ---
    const insertUser = db.prepare('INSERT INTO users (id, name, email, password, role, roll_no, phone) VALUES (?, ?, ?, ?, ?, ?, ?)');
    await insertUser.run('admin-1', 'System Admin', 'admin@nu.edu.pk', 'admin123', 'ADMIN', 'ADMIN-001', '0300-1234567');
    await insertUser.run('admin-2', 'Dr. Sarah Khan', 'sarah.khan@nu.edu.pk', 'admin123', 'ADMIN', 'ADMIN-002', '0301-2345678');
    await insertUser.run('admin-3', 'Prof. Ahmed Raza', 'ahmed.raza@nu.edu.pk', 'admin123', 'ADMIN', 'ADMIN-003', '0302-3456789');
    await insertUser.run('head-1', 'Hassan Ali (Procom)', 'headprocom@nu.edu.pk', 'pass123', 'SOCIETY_HEAD', 'PRO-001', '0310-1234567');
    await insertUser.run('head-2', 'Zainab Sheikh (ACES)', 'headaces@nu.edu.pk', 'pass123', 'SOCIETY_HEAD', 'ACE-001', '0311-2345678');
    await insertUser.run('head-3', 'Omer Farooq (NCC)', 'headncc@nu.edu.pk', 'pass123', 'SOCIETY_HEAD', 'NCC-001', '0312-3456789');
    await insertUser.run('head-4', 'Ayesha Malik (Dramatics)', 'headdrama@nu.edu.pk', 'pass123', 'SOCIETY_HEAD', 'DRA-001', '0313-4567890');
    await insertUser.run('head-5', 'Bilal Khan (Sports)', 'headsports@nu.edu.pk', 'pass123', 'SOCIETY_HEAD', 'SPT-001', '0314-5678901');
    await insertUser.run('head-6', 'Fatima Noor (Literary)', 'headliterary@nu.edu.pk', 'pass123', 'SOCIETY_HEAD', 'LIT-001', '0315-6789012');
    await insertUser.run('student-1', 'Taha Anwar', 'taha@nu.edu.pk', 'student123', 'STUDENT', '21K-1234', '0340-1234567');
    await insertUser.run('student-2', 'Ali Raza', 'ali.raza@nu.edu.pk', 'student123', 'STUDENT', '21K-5678', '0341-2345678');
    await insertUser.run('student-3', 'Sara Ahmed', 'sara.ahmed@nu.edu.pk', 'student123', 'STUDENT', '22K-4321', '0342-3456789');
    await insertUser.run('student-4', 'Usman Khalid', 'usman.k@nu.edu.pk', 'student123', 'STUDENT', '22K-8765', '0343-4567890');
    await insertUser.run('student-5', 'Hira Naz', 'hira.naz@nu.edu.pk', 'student123', 'STUDENT', '23K-1357', '0344-5678901');
    await insertUser.run('student-6', 'Daniyal Hussain', 'daniyal.h@nu.edu.pk', 'student123', 'STUDENT', '23K-2468', '0345-6789012');
    await insertUser.run('student-7', 'Maha Siddiqui', 'maha.s@nu.edu.pk', 'student123', 'STUDENT', '21K-9753', '0346-7890123');
    await insertUser.run('student-8', 'Zohaib Iqbal', 'zohaib.i@nu.edu.pk', 'student123', 'STUDENT', '22K-8642', '0347-8901234');

    // Co-Head users (needed for societies.co_head_id references)
    await insertUser.run('cohead-1', 'Rizwan Ahmed', 'rizwan.a@nu.edu.pk', 'pass123', 'SOCIETY_HEAD', 'PRO-002', '0320-1111111');
    await insertUser.run('cohead-2', 'Mariam Qureshi', 'mariam.q@nu.edu.pk', 'pass123', 'SOCIETY_HEAD', 'ACE-002', '0321-2222222');
    await insertUser.run('cohead-3', 'Saad Afridi', 'saad.a@nu.edu.pk', 'pass123', 'SOCIETY_HEAD', 'NCC-002', '0322-3333333');
    await insertUser.run('cohead-4', 'Kiran Shah', 'kiran.s@nu.edu.pk', 'pass123', 'SOCIETY_HEAD', 'DRA-002', '0323-4444444');
    await insertUser.run('cohead-5', 'Tariq Mehmood', 'tariq.m@nu.edu.pk', 'pass123', 'SOCIETY_HEAD', 'SPT-002', '0324-5555555');
    await insertUser.run('cohead-6', 'Amna Hassan', 'amna.h@nu.edu.pk', 'pass123', 'SOCIETY_HEAD', 'LIT-002', '0325-6666666');

    // Additional students for more coverage
    await insertUser.run('student-9', 'Neha Patel', 'neha.p@nu.edu.pk', 'student123', 'STUDENT', '23K-3579', '0348-9012345');
    await insertUser.run('student-10', 'Faisal Nawaz', 'faisal.n@nu.edu.pk', 'student123', 'STUDENT', '22K-1593', '0349-0123456');
    await insertUser.run('student-11', 'Laiba Khan', 'laiba.k@nu.edu.pk', 'student123', 'STUDENT', '23K-7531', '0350-1234567');
    await insertUser.run('student-12', 'Ahmed Zubair', 'ahmed.z@nu.edu.pk', 'student123', 'STUDENT', '21K-8642', '0351-2345678');

    // --- Venues ---
    const insertVenue = db.prepare('INSERT INTO venues (id, name, location, capacity) VALUES (?, ?, ?, ?)');
    await insertVenue.run('v1', 'Main Auditorium', 'Block A, Ground Floor', 500);
    await insertVenue.run('v2', 'Seminar Hall 1', 'Block B, 1st Floor', 150);
    await insertVenue.run('v3', 'Seminar Hall 2', 'Block B, 2nd Floor', 120);
    await insertVenue.run('v4', 'Computer Lab 1', 'Block C, Ground Floor', 60);
    await insertVenue.run('v5', 'Sports Ground', 'Outdoor Area', 300);
    await insertVenue.run('v6', 'Conference Room', 'Block A, 3rd Floor', 40);
    await insertVenue.run('v7', 'Multi-Purpose Hall', 'Block D, Ground Floor', 250);

    // --- Societies ---
    const insertSociety = db.prepare('INSERT INTO societies (id, name, description, head_id, co_head_id, category, established_year, contact_email, vision, status, admin_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    await insertSociety.run('s1', 'Procom', 'Premier computing society organizing Pakistan\'s largest IT event. Fostering innovation, competitive programming, and tech leadership among students.', 'head-1', 'cohead-1', 'TECHNICAL', 1998, 'procom@nu.edu.pk', 'To be the leading platform for technological innovation and computing excellence in Pakistan.', 'APPROVED', 'admin-1');
    await insertSociety.run('s2', 'ACES', 'Association of Civil Engineering Students. Promoting civil engineering through workshops, industrial visits, and inter-university competitions.', 'head-2', 'cohead-2', 'TECHNICAL', 2002, 'aces@nu.edu.pk', 'Building the future through structural innovation and engineering excellence.', 'APPROVED', 'admin-1');
    await insertSociety.run('s3', 'NCC', 'NUCES Computing Club. Dedicated to software development, web technologies, AI/ML research, and open source contributions.', 'head-3', 'cohead-3', 'TECHNICAL', 2005, 'ncc@nu.edu.pk', 'Empowering students to build real-world software solutions.', 'APPROVED', 'admin-1');
    await insertSociety.run('s4', 'Dramatics Club', 'The official dramatics and performing arts society. Organizing theater productions, mime shows, and drama competitions.', 'head-4', 'cohead-4', 'CULTURAL', 2000, 'drama@nu.edu.pk', 'Unleashing creativity through the art of performance.', 'APPROVED', 'admin-1');
    await insertSociety.run('s5', 'Sports Society', 'Organizing inter-department and inter-university sports tournaments including cricket, football, basketball, and table tennis.', 'head-5', 'cohead-5', 'SPORTS', 1999, 'sports@nu.edu.pk', 'Promoting physical fitness, teamwork, and sportsmanship.', 'APPROVED', 'admin-1');
    await insertSociety.run('s6', 'Literary Society', 'Fostering literary talent through debates, poetry recitals, essay writing competitions, and publication of the university magazine.', 'head-6', 'cohead-6', 'LITERARY', 2001, 'literary@nu.edu.pk', 'Nurturing the art of expression through words.', 'APPROVED', 'admin-1');

    // --- Events ---
    const insertEvent = db.prepare('INSERT INTO events (id, title, description, date, time, end_time, capacity, society_id, venue_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    await insertEvent.run('e0a', 'Job Fair', 'Annual job fair connecting students with top employers from tech, finance, and engineering industries.', '2026-05-31', '09:00', '15:00', 100, 's1', 'v1', 'PUBLISHED');
    await insertEvent.run('e0b', 'Check', 'System check event for testing venue scheduling and registration workflows.', '2026-06-05', '10:00', '12:00', 100, 's1', 'v2', 'PUBLISHED');
    await insertEvent.run('e1', 'Internal Hackathon 2026', '24-hour hackathon challenging students to build innovative solutions for real-world problems using cutting-edge technology.', '2026-06-15', '10:00', '16:00', 100, 's1', 'v1', 'PUBLISHED');
    await insertEvent.run('e2', 'Speed Programming Contest', 'Competitive programming contest testing algorithmic thinking and coding speed under time pressure. Individual participation.', '2026-06-20', '09:00', '13:00', 80, 's1', 'v4', 'PUBLISHED');
    await insertEvent.run('e3', 'Web Dev Bootcamp', 'Hands-on workshop covering React, Node.js, and full-stack development. Beginners welcome. Laptops required.', '2026-07-05', '14:00', '16:00', 50, 's3', 'v4', 'PUBLISHED');
    await insertEvent.run('e4', 'Annual Theater Festival', 'Three-day theater festival featuring original plays written and performed by FAST students. Open to all departments.', '2026-07-10', '13:00', '16:00', 200, 's4', 'v7', 'PUBLISHED');
    await insertEvent.run('e5', 'Inter-Department Cricket Tournament', 'Weekend cricket tournament with teams from CS, EE, CE, and BBA departments. Knockout format.', '2026-07-12', '08:00', '15:00', 120, 's5', 'v5', 'PUBLISHED');
    await insertEvent.run('e6', 'All Pakistan Debate Championship', 'National-level bilingual debate competition with participants from 20+ universities across Pakistan.', '2026-08-01', '10:00', '14:00', 150, 's6', 'v1', 'PENDING');
    await insertEvent.run('e7', 'AI/ML Workshop Series', 'Week-long workshop series on machine learning fundamentals, neural networks, and practical AI applications with Python.', '2026-08-10', '11:00', '14:00', 40, 's3', 'v6', 'PENDING');
    await insertEvent.run('e8', 'Bridge Building Competition', 'Civil engineering challenge to design and construct scale model bridges tested for structural integrity.', '2026-07-25', '09:00', '12:00', 60, 's2', 'v3', 'PUBLISHED');
    await insertEvent.run('e9', 'Startup Idea Pitch Night', 'Pitch your startup idea to a panel of industry judges. Top 3 ideas get mentorship and incubation support.', '2026-06-28', '13:00', '16:00', 80, 's1', 'v2', 'PUBLISHED');
    await insertEvent.run('e10', 'Poetry Slam', 'Open mic poetry event featuring Urdu and English poetry. Express yourself through spoken word.', '2026-07-18', '14:00', '16:00', 60, 's6', 'v3', 'PENDING');

    // --- Registrations ---
    const insertReg = db.prepare('INSERT INTO registrations (id, user_id, event_id, status) VALUES (?, ?, ?, ?)');
    await insertReg.run('r1', 'student-1', 'e1', 'REGISTERED');
    await insertReg.run('r2', 'student-2', 'e1', 'REGISTERED');
    await insertReg.run('r3', 'student-3', 'e1', 'REGISTERED');
    await insertReg.run('r4', 'student-1', 'e2', 'REGISTERED');
    await insertReg.run('r5', 'student-4', 'e2', 'REGISTERED');
    await insertReg.run('r6', 'student-5', 'e3', 'REGISTERED');
    await insertReg.run('r7', 'student-6', 'e3', 'REGISTERED');
    await insertReg.run('r8', 'student-7', 'e3', 'REGISTERED');
    await insertReg.run('r9', 'student-1', 'e4', 'REGISTERED');
    await insertReg.run('r10', 'student-8', 'e4', 'REGISTERED');
    await insertReg.run('r11', 'student-2', 'e5', 'REGISTERED');
    await insertReg.run('r12', 'student-3', 'e5', 'REGISTERED');
    await insertReg.run('r13', 'student-4', 'e5', 'REGISTERED');
    await insertReg.run('r14', 'student-5', 'e8', 'REGISTERED');
    await insertReg.run('r15', 'student-6', 'e9', 'REGISTERED');
    await insertReg.run('r16', 'student-1', 'e9', 'REGISTERED');
    await insertReg.run('r17', 'student-7', 'e9', 'REGISTERED');
    await insertReg.run('r18', 'student-8', 'e2', 'REGISTERED');
    await insertReg.run('r19', 'student-2', 'e4', 'REGISTERED');
    await insertReg.run('r20', 'student-5', 'e4', 'REGISTERED');
    await insertReg.run('r21', 'student-9', 'e1', 'REGISTERED');
    await insertReg.run('r22', 'student-10', 'e5', 'REGISTERED');
    await insertReg.run('r23', 'student-11', 'e6', 'REGISTERED');
    await insertReg.run('r24', 'student-12', 'e1', 'REGISTERED');
    await insertReg.run('r25', 'student-9', 'e3', 'REGISTERED');
    await insertReg.run('r26', 'student-3', 'e8', 'REGISTERED');
    await insertReg.run('r27', 'student-10', 'e9', 'REGISTERED');
    await insertReg.run('r28', 'student-11', 'e4', 'REGISTERED');
    await insertReg.run('r29', 'student-12', 'e5', 'REGISTERED');
    await insertReg.run('r30', 'student-7', 'e1', 'REGISTERED');
    await insertReg.run('r31', 'student-6', 'e4', 'REGISTERED');
    await insertReg.run('r32', 'student-4', 'e9', 'REGISTERED');

    // Mark some registrations as ATTENDED for testing feedback
    await db.prepare("UPDATE registrations SET status = 'ATTENDED' WHERE id IN ('r1', 'r2', 'r3', 'r4', 'r5', 'r14', 'r15', 'r16')").run();

    // --- Admins ---
    const insertAdmin = db.prepare('INSERT INTO admins (id, name, email, password, department, access_level, phone) VALUES (?, ?, ?, ?, ?, ?, ?)');
    await insertAdmin.run('adm-1', 'System Admin', 'sysadmin@nu.edu.pk', 'admin123', 'IT Administration', 'FULL', '0300-1111111');
    await insertAdmin.run('adm-2', 'Dr. Sarah Khan', 'sarah.khan@nu.edu.pk', 'admin123', 'Student Affairs', 'FULL', '0301-2222222');
    await insertAdmin.run('adm-3', 'Prof. Ahmed Raza', 'ahmed.raza@nu.edu.pk', 'admin123', 'Academic Affairs', 'FULL', '0302-3333333');
    await insertAdmin.run('adm-4', 'Syed Kamran', 'kamran@nu.edu.pk', 'admin123', 'IT Administration', 'LIMITED', '0303-4444444');
    await insertAdmin.run('adm-5', 'Nadia Ashraf', 'nadia.a@nu.edu.pk', 'admin123', 'Student Affairs', 'LIMITED', '0304-5555555');

    // --- Heads ---
    const insertHead = db.prepare('INSERT INTO heads (id, name, email, password, society_id, department, phone, tenure_start) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    await insertHead.run('hd-1', 'Hassan Ali', 'hassan.ali@nu.edu.pk', 'pass123', 's1', 'Computer Science', '0310-1234567', '2025-09-01');
    await insertHead.run('hd-2', 'Zainab Sheikh', 'zainab.s@nu.edu.pk', 'pass123', 's2', 'Civil Engineering', '0311-2345678', '2025-09-01');
    await insertHead.run('hd-3', 'Omer Farooq', 'omer.f@nu.edu.pk', 'pass123', 's3', 'Computer Science', '0312-3456789', '2025-09-01');
    await insertHead.run('hd-4', 'Ayesha Malik', 'ayesha.m@nu.edu.pk', 'pass123', 's4', 'Computer Science', '0313-4567890', '2025-10-01');
    await insertHead.run('hd-5', 'Bilal Khan', 'bilal.k@nu.edu.pk', 'pass123', 's5', 'Electrical Engineering', '0314-5678901', '2025-09-01');
    await insertHead.run('hd-6', 'Fatima Noor', 'fatima.n@nu.edu.pk', 'pass123', 's6', 'Computer Science', '0315-6789012', '2025-10-01');

    // --- Co-Heads ---
    const insertCoHead = db.prepare('INSERT INTO co_heads (id, name, email, password, society_id, department, phone, tenure_start) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    await insertCoHead.run('ch-1', 'Rizwan Ahmed', 'rizwan.a@nu.edu.pk', 'pass123', 's1', 'Computer Science', '0320-1111111', '2025-09-01');
    await insertCoHead.run('ch-2', 'Mariam Qureshi', 'mariam.q@nu.edu.pk', 'pass123', 's2', 'Civil Engineering', '0321-2222222', '2025-09-01');
    await insertCoHead.run('ch-3', 'Saad Afridi', 'saad.a@nu.edu.pk', 'pass123', 's3', 'Computer Science', '0322-3333333', '2025-09-01');
    await insertCoHead.run('ch-4', 'Kiran Shah', 'kiran.s@nu.edu.pk', 'pass123', 's4', 'Electrical Engineering', '0323-4444444', '2025-10-01');
    await insertCoHead.run('ch-5', 'Tariq Mehmood', 'tariq.m@nu.edu.pk', 'pass123', 's5', 'Mechanical Engineering', '0324-5555555', '2025-09-01');
    await insertCoHead.run('ch-6', 'Amna Hassan', 'amna.h@nu.edu.pk', 'pass123', 's6', 'Business Administration', '0325-6666666', '2025-10-01');

    // --- Student Members ---
    const insertMember = db.prepare('INSERT INTO student_members (id, name, email, password, society_id, roll_no, department, semester, phone, joined_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    await insertMember.run('sm-1', 'Taha Anwar', 'taha@nu.edu.pk', 'student123', 's1', '21K-1234', 'Computer Science', 8, '0340-1234567', '2024-09-01');
    await insertMember.run('sm-2', 'Ali Raza', 'ali.raza@nu.edu.pk', 'student123', 's1', '21K-5678', 'Computer Science', 8, '0341-2345678', '2024-09-01');
    await insertMember.run('sm-3', 'Sara Ahmed', 'sara.ahmed@nu.edu.pk', 'student123', 's3', '22K-4321', 'Computer Science', 6, '0342-3456789', '2025-02-01');
    await insertMember.run('sm-4', 'Usman Khalid', 'usman.k@nu.edu.pk', 'student123', 's5', '22K-8765', 'Electrical Engineering', 6, '0343-4567890', '2025-02-01');
    await insertMember.run('sm-5', 'Hira Naz', 'hira.naz@nu.edu.pk', 'student123', 's4', '23K-1357', 'Computer Science', 4, '0344-5678901', '2025-09-01');
    await insertMember.run('sm-6', 'Daniyal Hussain', 'daniyal.h@nu.edu.pk', 'student123', 's2', '23K-2468', 'Civil Engineering', 4, '0345-6789012', '2025-09-01');
    await insertMember.run('sm-7', 'Maha Siddiqui', 'maha.s@nu.edu.pk', 'student123', 's6', '21K-9753', 'Computer Science', 8, '0346-7890123', '2024-02-01');
    await insertMember.run('sm-8', 'Zohaib Iqbal', 'zohaib.i@nu.edu.pk', 'student123', 's3', '22K-8642', 'Computer Science', 6, '0347-8901234', '2025-02-01');
    await insertMember.run('sm-9', 'Neha Patel', 'neha.p@nu.edu.pk', 'student123', 's4', '23K-3579', 'Business Administration', 4, '0348-9012345', '2025-09-01');
    await insertMember.run('sm-10', 'Faisal Nawaz', 'faisal.n@nu.edu.pk', 'student123', 's5', '22K-1593', 'Electrical Engineering', 6, '0349-0123456', '2025-02-01');
    await insertMember.run('sm-11', 'Laiba Khan', 'laiba.k@nu.edu.pk', 'student123', 's6', '23K-7531', 'Computer Science', 2, '0350-1234567', '2026-02-01');
    await insertMember.run('sm-12', 'Ahmed Zubair', 'ahmed.z@nu.edu.pk', 'student123', 's1', '21K-8642', 'Computer Science', 8, '0351-2345678', '2024-02-01');
  }
}

// initDb(); // Moved to startServer

// --- Express App ---
const app = express();
app.use(express.json());
app.use(cookieParser());

// --- Auth Middleware ---
const authMiddleware = async (req: any, res: any, next: any) => {
  const userId = req.cookies.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  
  const user = await db.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(userId);
  if (!user) return res.status(401).json({ error: 'User not found' });
  
  req.user = user;
  next();
};

// --- API Routes ---

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await db.prepare('SELECT * FROM users WHERE email = ? AND password = ?').get(email, password);
  if (user) {
    res.cookie('userId', user.id, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 24 * 60 * 60 * 1000, secure: isPostgres });
    const { password: _, ...userWithoutPass } = user;
    res.json(userWithoutPass);
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('userId', { path: '/', httpOnly: true, sameSite: 'lax', secure: isPostgres });
  res.json({ success: true });
});

app.get('/api/auth/me', async (req, res) => {
  const userId = req.cookies.userId;
  if (!userId) return res.json(null);
  try {
    const user = await db.prepare('SELECT id, name, email, role, roll_no, phone FROM users WHERE id = ?').get(userId);
    if (!user) {
      // User doesn't exist — clear stale cookie
      res.clearCookie('userId', { path: '/', httpOnly: true, sameSite: 'lax', secure: isPostgres });
      return res.json(null);
    }
    res.json(user);
  } catch {
    res.clearCookie('userId', { path: '/', httpOnly: true, sameSite: 'lax', secure: isPostgres });
    res.json(null);
  }
});

app.get('/api/societies', async (req, res) => {
  const societies = await db.prepare(`
    SELECT s.*, u1.name as head_name, u2.name as co_head_name
    FROM societies s 
    LEFT JOIN users u1 ON s.head_id = u1.id
    LEFT JOIN users u2 ON s.co_head_id = u2.id
  `).all();
  res.json(societies);
});

app.get('/api/events', async (req, res) => {
  const events = await db.prepare(`
    SELECT e.*, s.name as society_name, v.name as venue_name, v.location as venue_location,
      (SELECT COUNT(*) FROM registrations r JOIN users u ON r.user_id = u.id WHERE r.event_id = e.id AND r.status = 'REGISTERED') as participant_count
    FROM events e
    JOIN societies s ON e.society_id = s.id
    JOIN venues v ON e.venue_id = v.id
    WHERE e.status = 'PUBLISHED'
    ORDER BY e.date ASC
  `).all();
  res.json(events);
});

app.get('/api/events/:id', async (req, res) => {
  const event = await db.prepare(`
    SELECT e.*, s.name as society_name, v.name as venue_name, v.location as venue_location
    FROM events e
    JOIN societies s ON e.society_id = s.id
    JOIN venues v ON e.venue_id = v.id
    WHERE e.id = ?
  `).get(req.params.id);
  res.json(event);
});

app.post('/api/events/:id/register', authMiddleware, async (req: any, res) => {
  const eventId = req.params.id;
  const userId = req.user.id;
  const existing = await db.prepare('SELECT * FROM registrations WHERE user_id = ? AND event_id = ?').get(userId, eventId);
  if (existing) {
    if (existing.status === 'REGISTERED') return res.status(400).json({ error: 'Already registered' });
    if (existing.status === 'ATTENDED') return res.status(400).json({ error: 'Already attended' });
    await db.prepare("UPDATE registrations SET status = 'REGISTERED', registered_at = CURRENT_TIMESTAMP WHERE id = ?").run(existing.id);
    return res.json({ success: true });
  }
  // Check capacity
  const event = await db.prepare('SELECT capacity FROM events WHERE id = ?').get(eventId);
  if (!event) return res.status(404).json({ error: 'Event not found' });
  const count = await db.prepare("SELECT COUNT(*) as cnt FROM registrations WHERE event_id = ? AND status = 'REGISTERED'").get(eventId);
  if (count.cnt >= event.capacity) return res.status(400).json({ error: 'Event is full' });
  const id = Math.random().toString(36).substring(2, 11);
  await db.prepare('INSERT INTO registrations (id, user_id, event_id) VALUES (?, ?, ?)').run(id, userId, eventId);
  res.json({ success: true });
});

// Admin System
app.get('/api/admin/system/inspect', authMiddleware, async (req: any, res) => {
  if (req.user.role !== 'ADMIN') return res.status(403).end();
  try {
    let tables: any[] = [];
    if (isPostgres) {
        tables = await db.prepare("SELECT table_name as name FROM information_schema.tables WHERE table_schema = 'public'").all();
    } else {
        tables = await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
    }
    const result: any = {};
    for (const table of tables) {
      result[table.name] = await db.prepare(`SELECT * FROM ${table.name}`).all();
    }
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/stats', authMiddleware, async (req: any, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).end();
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
});

app.post('/api/admin/societies', authMiddleware, async (req: any, res) => {
  if (req.user.role !== 'ADMIN') return res.status(403).end();
  const { name, description, category, established_year, contact_email, vision } = req.body;
  const id = Math.random().toString(36).substring(2, 11);
  await db.prepare(`
    INSERT INTO societies (id, name, description, category, established_year, contact_email, vision, status, admin_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'APPROVED', ?)
  `).run(id, name, description, category, established_year || null, contact_email, vision, req.user.id);
  res.json({ success: true, id });
});

app.patch('/api/admin/societies/:id/roles', authMiddleware, async (req: any, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).end();
    const { head_id, co_head_id } = req.body;
    const { id } = req.params;
    
    if (head_id !== undefined) {
      await db.prepare('UPDATE societies SET head_id = ? WHERE id = ?').run(head_id, id);
      if (head_id) await db.prepare("UPDATE users SET role = 'SOCIETY_HEAD' WHERE id = ?").run(head_id);
    }
    if (co_head_id !== undefined) {
      await db.prepare('UPDATE societies SET co_head_id = ? WHERE id = ?').run(co_head_id, id);
    }
    res.json({ success: true });
});

app.delete('/api/admin/societies/:id', authMiddleware, async (req: any, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).end();
    await db.prepare('DELETE FROM societies WHERE id = ?').run(req.params.id);
    res.json({ success: true });
});

app.get('/api/admin/users', authMiddleware, async (req: any, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).end();
    const users = await db.prepare('SELECT id, name, email, role, roll_no FROM users').all();
    res.json(users);
});

app.get('/api/admin/pending-events', authMiddleware, async (req: any, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).end();
    const events = await db.prepare("SELECT e.*, s.name as society_name FROM events e JOIN societies s ON e.society_id = s.id WHERE e.status = 'PENDING'").all();
    res.json(events);
});

app.post('/api/admin/approve-event/:id', authMiddleware, async (req: any, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).end();
    await db.prepare("UPDATE events SET status = 'PUBLISHED' WHERE id = ?").run(req.params.id);
    res.json({ success: true });
});

app.post('/api/admin/reject-event/:id', authMiddleware, async (req: any, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).end();
    await db.prepare("UPDATE events SET status = 'CANCELLED' WHERE id = ?").run(req.params.id);
    res.json({ success: true });
});

app.get('/api/head/my-events', authMiddleware, async (req: any, res) => {
    if (req.user.role !== 'SOCIETY_HEAD') return res.status(403).end();
    const events = await db.prepare(`
      SELECT e.*, v.name as venue_name,
        (SELECT COUNT(*) FROM registrations r JOIN users u ON r.user_id = u.id WHERE r.event_id = e.id AND r.status = 'REGISTERED') as reg_count
      FROM events e
      JOIN societies s ON e.society_id = s.id
      JOIN venues v ON e.venue_id = v.id
      WHERE s.head_id = ?
    `).all(req.user.id);
    res.json(events);
});

app.post('/api/head/create-event', authMiddleware, async (req: any, res) => {
    if (req.user.role !== 'SOCIETY_HEAD') return res.status(403).end();
    const { title, description, date, time, end_time, capacity, venue_id } = req.body;
    const society = await db.prepare('SELECT id FROM societies WHERE head_id = ?').get(req.user.id);
    if (!society) return res.status(400).json({ error: 'No society found' });
    if (!end_time) return res.status(400).json({ error: 'End time is required' });
    if (time >= end_time) return res.status(400).json({ error: 'End time must be after start time' });

    // Validate venue capacity
    const venue = await db.prepare('SELECT * FROM venues WHERE id = ?').get(venue_id);
    if (!venue) return res.status(400).json({ error: 'Venue not found' });
    if (Number(capacity) > Number(venue.capacity)) return res.status(400).json({ error: `Event capacity (${capacity}) exceeds venue capacity (${venue.capacity})` });

    // Check for time conflicts at this venue on this date
    const conflicts = await db.prepare(
      "SELECT * FROM events WHERE venue_id = ? AND date = ? AND status != 'CANCELLED' AND ((time < ? AND end_time > ?) OR (time < ? AND end_time > ?))"
    ).all(venue_id, date, end_time, time, end_time, time);
    if (conflicts.length > 0) {
      return res.status(400).json({ error: `Venue is already booked from ${conflicts[0].time} to ${conflicts[0].end_time} on ${date}` });
    }

    const id = Math.random().toString(36).substring(2, 11);
    await db.prepare('INSERT INTO events (id, title, description, date, time, end_time, capacity, society_id, venue_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(id, title, description, date, time, end_time, capacity, society.id, venue_id);
    res.json({ success: true, id });
});

app.get('/api/venues', async (req, res) => {
    const venues = await db.prepare('SELECT * FROM venues').all();
    res.json(venues);
});

// Get venue schedule for a specific date
app.get('/api/venues/:id/schedule', async (req, res) => {
    const { id } = req.params;
    const date = req.query.date as string;
    if (!date) return res.status(400).json({ error: 'Date query parameter required' });
    const bookings = await db.prepare(
      "SELECT title, time, end_time FROM events WHERE venue_id = ? AND date = ? AND status != 'CANCELLED' ORDER BY time"
    ).all(id, date);
    res.json(bookings);
});

// Get available time slots for a venue on a date
app.get('/api/venues/:id/availability', async (req, res) => {
    const { id } = req.params;
    const date = req.query.date as string;
    if (!date) return res.status(400).json({ error: 'Date query parameter required' });
    const bookings = await db.prepare(
      "SELECT time, end_time FROM events WHERE venue_id = ? AND date = ? AND status != 'CANCELLED' ORDER BY time"
    ).all(id, date);

    // Uni hours: 08:00 to 16:00
    const uniStart = 480; // 8*60
    const uniEnd = 960;   // 16*60
    const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
    const toTime = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

    const slots: { start: string, end: string }[] = [];
    let cursor = uniStart;
    for (const b of bookings) {
      const bStart = toMin(b.time);
      const bEnd = toMin(b.end_time);
      if (cursor < bStart) {
        slots.push({ start: toTime(cursor), end: toTime(bStart) });
      }
      cursor = Math.max(cursor, bEnd);
    }
    if (cursor < uniEnd) {
      slots.push({ start: toTime(cursor), end: toTime(uniEnd) });
    }
    res.json({ venue_id: id, date, bookings, available_slots: slots });
});

// --- Admin Venue Management ---
app.post('/api/admin/venues', authMiddleware, async (req: any, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).end();
    const { name, location, capacity } = req.body;
    if (!name || !location || !capacity) return res.status(400).json({ error: 'Name, location, and capacity are required' });
    const id = 'v-' + Math.random().toString(36).substring(2, 8);
    await db.prepare('INSERT INTO venues (id, name, location, capacity) VALUES (?, ?, ?, ?)')
      .run(id, name, location, capacity);
    res.json({ success: true, id });
});

app.delete('/api/admin/venues/:id', authMiddleware, async (req: any, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).end();
    // Check if any events use this venue
    const events = await db.prepare('SELECT id FROM events WHERE venue_id = ?').get(req.params.id);
    if (events) return res.status(400).json({ error: 'Cannot delete venue with assigned events' });
    await db.prepare('DELETE FROM venues WHERE id = ?').run(req.params.id);
    res.json({ success: true });
});

// Student registrations
app.get('/api/registrations/my', authMiddleware, async (req: any, res) => {
    const regs = await db.prepare("SELECT event_id, status FROM registrations WHERE user_id = ? AND status IN ('REGISTERED', 'ATTENDED')").all(req.user.id);
    res.json(regs);
});

// Admin SQL query
app.post('/api/admin/query', authMiddleware, async (req: any, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).end();
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: 'No query provided' });
    try {
      const result = await db.prepare(query).all();
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
});

// Event participants
app.get('/api/events/:id/participants', authMiddleware, async (req: any, res) => {
    const participants = await db.prepare(`
      SELECT u.id, u.name, u.email, u.roll_no, u.phone
      FROM registrations r
      JOIN users u ON r.user_id = u.id
      WHERE r.event_id = ? AND r.status = 'REGISTERED'
    `).all(req.params.id);
    res.json(participants);
});

// --- Dedicated Role Tables API (Admin only) ---

// Admins
app.get('/api/admin/admins', authMiddleware, async (req: any, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).end();
    const admins = await db.prepare('SELECT id, name, email, department, access_level, phone, created_at FROM admins').all();
    res.json(admins);
});

app.post('/api/admin/admins', authMiddleware, async (req: any, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).end();
    const { name, email, password, department, access_level, phone } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Name, email, and password are required' });
    const id = 'adm-' + Math.random().toString(36).substring(2, 8);
    try {
      await db.prepare('INSERT INTO admins (id, name, email, password, department, access_level, phone) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(id, name, email, password, department || null, access_level || 'FULL', phone || null);
      res.json({ success: true, id });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
});

app.delete('/api/admin/admins/:id', authMiddleware, async (req: any, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).end();
    await db.prepare('DELETE FROM admins WHERE id = ?').run(req.params.id);
    res.json({ success: true });
});

// Heads
app.get('/api/admin/heads', authMiddleware, async (req: any, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).end();
    const heads = await db.prepare(`
      SELECT h.*, s.name as society_name
      FROM heads h
      LEFT JOIN societies s ON h.society_id = s.id
    `).all();
    res.json(heads);
});

app.post('/api/admin/heads', authMiddleware, async (req: any, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).end();
    const { name, email, password, society_id, department, phone, tenure_start } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Name, email, and password are required' });
    const id = 'hd-' + Math.random().toString(36).substring(2, 8);
    try {
      await db.prepare('INSERT INTO heads (id, name, email, password, society_id, department, phone, tenure_start) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .run(id, name, email, password, society_id || null, department || null, phone || null, tenure_start || null);
      res.json({ success: true, id });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
});

app.delete('/api/admin/heads/:id', authMiddleware, async (req: any, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).end();
    await db.prepare('DELETE FROM heads WHERE id = ?').run(req.params.id);
    res.json({ success: true });
});

// Co-Heads
app.get('/api/admin/co-heads', authMiddleware, async (req: any, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).end();
    const coHeads = await db.prepare(`
      SELECT ch.*, s.name as society_name
      FROM co_heads ch
      LEFT JOIN societies s ON ch.society_id = s.id
    `).all();
    res.json(coHeads);
});

app.post('/api/admin/co-heads', authMiddleware, async (req: any, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).end();
    const { name, email, password, society_id, department, phone, tenure_start } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Name, email, and password are required' });
    const id = 'ch-' + Math.random().toString(36).substring(2, 8);
    try {
      await db.prepare('INSERT INTO co_heads (id, name, email, password, society_id, department, phone, tenure_start) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .run(id, name, email, password, society_id || null, department || null, phone || null, tenure_start || null);
      res.json({ success: true, id });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
});

app.delete('/api/admin/co-heads/:id', authMiddleware, async (req: any, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).end();
    await db.prepare('DELETE FROM co_heads WHERE id = ?').run(req.params.id);
    res.json({ success: true });
});

// Student Members
app.get('/api/admin/student-members', authMiddleware, async (req: any, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).end();
    const members = await db.prepare(`
      SELECT sm.id, sm.name, sm.email, sm.society_id, sm.roll_no, sm.department, sm.semester, sm.phone, sm.joined_date, sm.created_at, s.name as society_name
      FROM student_members sm
      LEFT JOIN societies s ON sm.society_id = s.id
    `).all();
    res.json(members);
});

app.post('/api/admin/student-members', authMiddleware, async (req: any, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).end();
    const { name, email, password, society_id, roll_no, department, semester, phone, joined_date } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Name, email, and password are required' });
    const id = 'sm-' + Math.random().toString(36).substring(2, 8);
    try {
      await db.prepare('INSERT INTO student_members (id, name, email, password, society_id, roll_no, department, semester, phone, joined_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .run(id, name, email, password, society_id || null, roll_no || null, department || null, semester || null, phone || null, joined_date || null);
      res.json({ success: true, id });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
});

app.delete('/api/admin/student-members/:id', authMiddleware, async (req: any, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).end();
    await db.prepare('DELETE FROM student_members WHERE id = ?').run(req.params.id);
    res.json({ success: true });
});

// --- Unregister ---
app.post('/api/events/:id/unregister', authMiddleware, async (req: any, res) => {
  const eventId = req.params.id;
  const userId = req.user.id;
  const existing = await db.prepare("SELECT * FROM registrations WHERE user_id = ? AND event_id = ? AND status = 'REGISTERED'").get(userId, eventId);
  if (!existing) return res.status(400).json({ error: 'Not registered' });
  await db.prepare("UPDATE registrations SET status = 'CANCELLED' WHERE user_id = ? AND event_id = ?").run(userId, eventId);
  res.json({ success: true });
});

// --- Feedback ---
app.post('/api/events/:id/feedback', authMiddleware, async (req: any, res) => {
  const eventId = req.params.id;
  const userId = req.user.id;
  const { rating, comments } = req.body;
  if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating must be between 1 and 5' });
  const reg = await db.prepare("SELECT * FROM registrations WHERE user_id = ? AND event_id = ? AND status = 'ATTENDED'").get(userId, eventId);
  if (!reg) return res.status(400).json({ error: 'You can only submit feedback for events you attended' });
  const existing = await db.prepare('SELECT * FROM feedback WHERE user_id = ? AND event_id = ?').get(userId, eventId);
  if (existing) return res.status(400).json({ error: 'Feedback already submitted' });
  const id = Math.random().toString(36).substring(2, 11);
  await db.prepare('INSERT INTO feedback (id, user_id, event_id, rating, comments) VALUES (?, ?, ?, ?, ?)').run(id, userId, eventId, rating, comments || null);
  res.json({ success: true });
});

app.get('/api/events/:id/feedback', authMiddleware, async (req: any, res) => {
  const feedbacks = await db.prepare(`
    SELECT f.*, u.name as user_name
    FROM feedback f
    JOIN users u ON f.user_id = u.id
    WHERE f.event_id = ?
    ORDER BY f.created_at DESC
  `).all(req.params.id);
  res.json(feedbacks);
});

// --- Society Head: Feedback for their events ---
app.get('/api/head/feedback', authMiddleware, async (req: any, res) => {
  if (req.user.role !== 'SOCIETY_HEAD') return res.status(403).end();
  const feedbacks = await db.prepare(`
    SELECT f.*, u.name as user_name, e.title as event_title
    FROM feedback f
    JOIN users u ON f.user_id = u.id
    JOIN events e ON f.event_id = e.id
    JOIN societies s ON e.society_id = s.id
    WHERE s.head_id = ?
    ORDER BY f.created_at DESC
  `).all(req.user.id);
  res.json(feedbacks);
});

// --- Attendance ---
app.post('/api/head/mark-attendance', authMiddleware, async (req: any, res) => {
  if (req.user.role !== 'SOCIETY_HEAD') return res.status(403).end();
  const { event_id, user_ids } = req.body;
  if (!event_id || !Array.isArray(user_ids)) return res.status(400).json({ error: 'event_id and user_ids required' });
  const event = await db.prepare(`
    SELECT e.* FROM events e
    JOIN societies s ON e.society_id = s.id
    WHERE e.id = ? AND s.head_id = ?
  `).get(event_id, req.user.id);
  if (!event) return res.status(403).json({ error: 'Not your event' });
  for (const uid of user_ids) {
    await db.prepare("UPDATE registrations SET status = 'ATTENDED' WHERE event_id = ? AND user_id = ?").run(event_id, uid);
  }
  res.json({ success: true });
});

app.get('/api/events/:id/attendance', authMiddleware, async (req: any, res) => {
  const participants = await db.prepare(`
    SELECT r.status as attendance_status, u.id, u.name, u.email, u.roll_no, u.phone
    FROM registrations r
    JOIN users u ON r.user_id = u.id
    WHERE r.event_id = ?
  `).all(req.params.id);
  res.json(participants);
});

// --- Event Requests (Update/Delete from Society Heads) ---
app.post('/api/head/event-request', authMiddleware, async (req: any, res) => {
  if (req.user.role !== 'SOCIETY_HEAD') return res.status(403).end();
  const { event_id, request_type, reason, proposed_title, proposed_description, proposed_date, proposed_time, proposed_end_time, proposed_capacity, proposed_venue_id } = req.body;
  if (!event_id || !request_type) return res.status(400).json({ error: 'event_id and request_type required' });
  if (!['UPDATE', 'DELETE'].includes(request_type)) return res.status(400).json({ error: 'request_type must be UPDATE or DELETE' });
  const event = await db.prepare(`
    SELECT e.* FROM events e
    JOIN societies s ON e.society_id = s.id
    WHERE e.id = ? AND s.head_id = ?
  `).get(event_id, req.user.id);
  if (!event) return res.status(403).json({ error: 'Not your event' });
  const id = Math.random().toString(36).substring(2, 11);
  await db.prepare(`
    INSERT INTO event_requests (id, event_id, head_id, request_type, reason, proposed_title, proposed_description, proposed_date, proposed_time, proposed_end_time, proposed_capacity, proposed_venue_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, event_id, req.user.id, request_type, reason || null, proposed_title || null, proposed_description || null, proposed_date || null, proposed_time || null, proposed_end_time || null, proposed_capacity || null, proposed_venue_id || null);
  res.json({ success: true, id });
});

app.get('/api/admin/event-requests', authMiddleware, async (req: any, res) => {
  if (req.user.role !== 'ADMIN') return res.status(403).end();
  const requests = await db.prepare(`
    SELECT er.*, e.title as event_title, u.name as head_name, s.name as society_name
    FROM event_requests er
    JOIN events e ON er.event_id = e.id
    JOIN users u ON er.head_id = u.id
    JOIN societies s ON e.society_id = s.id
    WHERE er.status = 'PENDING'
    ORDER BY er.created_at DESC
  `).all();
  res.json(requests);
});

app.post('/api/admin/approve-event-request/:id', authMiddleware, async (req: any, res) => {
  if (req.user.role !== 'ADMIN') return res.status(403).end();
  const request = await db.prepare('SELECT * FROM event_requests WHERE id = ?').get(req.params.id);
  if (!request) return res.status(404).json({ error: 'Request not found' });
  if (request.status !== 'PENDING') return res.status(400).json({ error: 'Request already processed' });

  if (request.request_type === 'DELETE') {
    await db.prepare('DELETE FROM registrations WHERE event_id = ?').run(request.event_id);
    await db.prepare('DELETE FROM events WHERE id = ?').run(request.event_id);
  } else if (request.request_type === 'UPDATE') {
    const updates: string[] = [];
    const params: any[] = [];
    if (request.proposed_title) { updates.push('title = ?'); params.push(request.proposed_title); }
    if (request.proposed_description) { updates.push('description = ?'); params.push(request.proposed_description); }
    if (request.proposed_date) { updates.push('date = ?'); params.push(request.proposed_date); }
    if (request.proposed_time) { updates.push('time = ?'); params.push(request.proposed_time); }
    if (request.proposed_end_time) { updates.push('end_time = ?'); params.push(request.proposed_end_time); }
    if (request.proposed_capacity) { updates.push('capacity = ?'); params.push(request.proposed_capacity); }
    if (request.proposed_venue_id) { updates.push('venue_id = ?'); params.push(request.proposed_venue_id); }
    if (updates.length > 0) {
      params.push(request.event_id);
      await db.prepare(`UPDATE events SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    }
  }
  await db.prepare("UPDATE event_requests SET status = 'APPROVED', resolved_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

app.post('/api/admin/reject-event-request/:id', authMiddleware, async (req: any, res) => {
  if (req.user.role !== 'ADMIN') return res.status(403).end();
  const { admin_reason } = req.body;
  const request = await db.prepare('SELECT * FROM event_requests WHERE id = ?').get(req.params.id);
  if (!request) return res.status(404).json({ error: 'Request not found' });
  if (request.status !== 'PENDING') return res.status(400).json({ error: 'Request already processed' });
  await db.prepare("UPDATE event_requests SET status = 'REJECTED', admin_reason = ?, resolved_at = CURRENT_TIMESTAMP WHERE id = ?").run(admin_reason || null, req.params.id);
  res.json({ success: true });
});

// --- Society Head Notifications ---
app.get('/api/head/notifications', authMiddleware, async (req: any, res) => {
  if (req.user.role !== 'SOCIETY_HEAD') return res.status(403).end();
  const notifications = await db.prepare(`
    SELECT er.*, e.title as event_title
    FROM event_requests er
    JOIN events e ON er.event_id = e.id
    WHERE er.head_id = ? AND er.status != 'PENDING'
    ORDER BY er.resolved_at DESC
  `).all(req.user.id);
  res.json(notifications);
});

app.get('/api/head/my-event-requests', authMiddleware, async (req: any, res) => {
  if (req.user.role !== 'SOCIETY_HEAD') return res.status(403).end();
  const requests = await db.prepare(`
    SELECT er.*, e.title as event_title
    FROM event_requests er
    JOIN events e ON er.event_id = e.id
    WHERE er.head_id = ?
    ORDER BY er.created_at DESC
  `).all(req.user.id);
  res.json(requests);
});

// --- Vite Middleware ---
async function startServer() {
  const PORT = 3000;
  
  console.log('--- SYSTEM: Initializing Database... ---');
  try {
    await initDb();
    console.log('--- SYSTEM: Database Initialized Successfully ---');
  } catch (err) {
    console.error('--- SYSTEM: Database Initialization FAILED! ---', err);
    process.exit(1);
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log('--- SYSTEM: Starting Vite in dev mode ---');
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    console.log('--- SYSTEM: Starting in production mode ---');
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`--- SYSTEM: Server listening on http://0.0.0.0:${PORT} ---`);
  });
}

startServer();
