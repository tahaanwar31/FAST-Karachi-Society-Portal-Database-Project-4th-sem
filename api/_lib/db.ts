import pg from 'pg';

let pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (!pool) {
    pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
  }
  return pool;
}

const toPgSql = (sql: string) => {
  let idx = 0;
  return sql.replace(/\?/g, () => `$${++idx}`);
};

export const db = {
  prepare: (sql: string) => ({
    get: async (...params: any[]) => {
      const res = await getPool().query(toPgSql(sql), params);
      return res.rows[0];
    },
    all: async (...params: any[]) => {
      const res = await getPool().query(toPgSql(sql), params);
      return res.rows;
    },
    run: async (...params: any[]) => {
      return await getPool().query(toPgSql(sql), params);
    }
  }),
  exec: async (sql: string) => {
    const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);
    for (const stmt of statements) {
      await getPool().query(stmt);
    }
  }
};

let initialized = false;

export async function initDb() {
  if (initialized) return;

  const schema = `
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'STUDENT',
      roll_no TEXT, phone TEXT
    );
    CREATE TABLE IF NOT EXISTS venues (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, location TEXT NOT NULL, capacity INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS societies (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT, category TEXT,
      established_year INTEGER, contact_email TEXT, vision TEXT,
      head_id TEXT, co_head_id TEXT
    );
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT,
      date TEXT NOT NULL, time TEXT NOT NULL, capacity INTEGER NOT NULL,
      society_id TEXT NOT NULL, venue_id TEXT NOT NULL, head_email TEXT,
      status TEXT NOT NULL DEFAULT 'PENDING', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS registrations (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, event_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'REGISTERED',
      registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, UNIQUE(user_id, event_id)
    );
    CREATE TABLE IF NOT EXISTS admins (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL, department TEXT, access_level TEXT DEFAULT 'FULL',
      phone TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS heads (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL, society_id TEXT, department TEXT,
      phone TEXT, tenure_start TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS co_heads (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL, society_id TEXT, department TEXT,
      phone TEXT, tenure_start TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS student_members (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL, society_id TEXT, roll_no TEXT,
      department TEXT, semester INTEGER, phone TEXT, joined_date TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  await db.exec(schema);

  const userCheck = await db.prepare('SELECT count(*) as count FROM users').get();
  if (parseInt(userCheck.count) === 0) {
    console.log('Seeding initial data...');
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
    await insertUser.run('cohead-1', 'Rizwan Ahmed', 'rizwan.a@nu.edu.pk', 'pass123', 'SOCIETY_HEAD', 'PRO-002', '0320-1111111');
    await insertUser.run('cohead-2', 'Mariam Qureshi', 'mariam.q@nu.edu.pk', 'pass123', 'SOCIETY_HEAD', 'ACE-002', '0321-2222222');
    await insertUser.run('cohead-3', 'Saad Afridi', 'saad.a@nu.edu.pk', 'pass123', 'SOCIETY_HEAD', 'NCC-002', '0322-3333333');
    await insertUser.run('cohead-4', 'Kiran Shah', 'kiran.s@nu.edu.pk', 'pass123', 'SOCIETY_HEAD', 'DRA-002', '0323-4444444');
    await insertUser.run('cohead-5', 'Tariq Mehmood', 'tariq.m@nu.edu.pk', 'pass123', 'SOCIETY_HEAD', 'SPT-002', '0324-5555555');
    await insertUser.run('cohead-6', 'Amna Hassan', 'amna.h@nu.edu.pk', 'pass123', 'SOCIETY_HEAD', 'LIT-002', '0325-6666666');
    await insertUser.run('student-9', 'Neha Patel', 'neha.p@nu.edu.pk', 'student123', 'STUDENT', '23K-3579', '0348-9012345');
    await insertUser.run('student-10', 'Faisal Nawaz', 'faisal.n@nu.edu.pk', 'student123', 'STUDENT', '22K-1593', '0349-0123456');
    await insertUser.run('student-11', 'Laiba Khan', 'laiba.k@nu.edu.pk', 'student123', 'STUDENT', '23K-7531', '0350-1234567');
    await insertUser.run('student-12', 'Ahmed Zubair', 'ahmed.z@nu.edu.pk', 'student123', 'STUDENT', '21K-8642', '0351-2345678');

    const insertVenue = db.prepare('INSERT INTO venues (id, name, location, capacity) VALUES (?, ?, ?, ?)');
    await insertVenue.run('v1', 'Main Auditorium', 'Block A, Ground Floor', 500);
    await insertVenue.run('v2', 'Seminar Hall 1', 'Block B, 1st Floor', 150);
    await insertVenue.run('v3', 'Seminar Hall 2', 'Block B, 2nd Floor', 120);
    await insertVenue.run('v4', 'Computer Lab 1', 'Block C, Ground Floor', 60);
    await insertVenue.run('v5', 'Sports Ground', 'Outdoor Area', 300);
    await insertVenue.run('v6', 'Conference Room', 'Block A, 3rd Floor', 40);
    await insertVenue.run('v7', 'Multi-Purpose Hall', 'Block D, Ground Floor', 250);

    const insertSociety = db.prepare('INSERT INTO societies (id, name, description, head_id, co_head_id, category, established_year, contact_email, vision) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    await insertSociety.run('s1', 'Procom', 'Premier computing society organizing Pakistan\'s largest IT event.', 'head-1', 'cohead-1', 'TECHNICAL', 1998, 'procom@nu.edu.pk', 'Leading platform for technological innovation.');
    await insertSociety.run('s2', 'ACES', 'Association of Civil Engineering Students.', 'head-2', 'cohead-2', 'TECHNICAL', 2002, 'aces@nu.edu.pk', 'Building the future through structural innovation.');
    await insertSociety.run('s3', 'NCC', 'NUCES Computing Club.', 'head-3', 'cohead-3', 'TECHNICAL', 2005, 'ncc@nu.edu.pk', 'Empowering students to build real-world software.');
    await insertSociety.run('s4', 'Dramatics Club', 'The official dramatics and performing arts society.', 'head-4', 'cohead-4', 'CULTURAL', 2000, 'drama@nu.edu.pk', 'Unleashing creativity through performance.');
    await insertSociety.run('s5', 'Sports Society', 'Organizing inter-department and inter-university sports tournaments.', 'head-5', 'cohead-5', 'SPORTS', 1999, 'sports@nu.edu.pk', 'Promoting physical fitness and sportsmanship.');
    await insertSociety.run('s6', 'Literary Society', 'Fostering literary talent through debates, poetry, and writing.', 'head-6', 'cohead-6', 'LITERARY', 2001, 'literary@nu.edu.pk', 'Nurturing the art of expression.');

    const insertEvent = db.prepare('INSERT INTO events (id, title, description, date, time, capacity, society_id, venue_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    await insertEvent.run('e1', 'Internal Hackathon 2026', '24-hour hackathon challenging students to build innovative solutions.', '2026-06-15', '10:00', 100, 's1', 'v1', 'PUBLISHED');
    await insertEvent.run('e2', 'Speed Programming Contest', 'Competitive programming contest testing algorithmic thinking.', '2026-06-20', '09:00', 80, 's1', 'v4', 'PUBLISHED');
    await insertEvent.run('e3', 'Web Dev Bootcamp', 'Hands-on workshop covering React, Node.js, and full-stack development.', '2026-07-05', '14:00', 50, 's3', 'v4', 'PUBLISHED');
    await insertEvent.run('e4', 'Annual Theater Festival', 'Three-day theater festival featuring original plays by FAST students.', '2026-07-10', '18:00', 200, 's4', 'v7', 'PUBLISHED');
    await insertEvent.run('e5', 'Inter-Department Cricket Tournament', 'Weekend cricket tournament with teams from CS, EE, CE, and BBA.', '2026-07-12', '08:00', 120, 's5', 'v5', 'PUBLISHED');
    await insertEvent.run('e6', 'All Pakistan Debate Championship', 'National-level bilingual debate competition.', '2026-08-01', '10:00', 150, 's6', 'v1', 'PENDING');
    await insertEvent.run('e7', 'AI/ML Workshop Series', 'Week-long workshop on machine learning and practical AI applications.', '2026-08-10', '11:00', 40, 's3', 'v6', 'PENDING');
    await insertEvent.run('e8', 'Bridge Building Competition', 'Civil engineering challenge to design scale model bridges.', '2026-07-25', '09:00', 60, 's2', 'v3', 'PUBLISHED');
    await insertEvent.run('e9', 'Startup Idea Pitch Night', 'Pitch your startup idea to industry judges.', '2026-06-28', '17:00', 80, 's1', 'v2', 'PUBLISHED');
    await insertEvent.run('e10', 'Poetry Slam', 'Open mic poetry event featuring Urdu and English poetry.', '2026-07-18', '16:00', 60, 's6', 'v3', 'PENDING');

    const insertReg = db.prepare('INSERT INTO registrations (id, user_id, event_id, status) VALUES (?, ?, ?, ?)');
    const regs = [
      ['r1','student-1','e1'],['r2','student-2','e1'],['r3','student-3','e1'],['r4','student-1','e2'],
      ['r5','student-4','e2'],['r6','student-5','e3'],['r7','student-6','e3'],['r8','student-7','e3'],
      ['r9','student-1','e4'],['r10','student-8','e4'],['r11','student-2','e5'],['r12','student-3','e5'],
      ['r13','student-4','e5'],['r14','student-5','e8'],['r15','student-6','e9'],['r16','student-1','e9'],
      ['r17','student-7','e9'],['r18','student-8','e2'],['r19','student-2','e4'],['r20','student-5','e4'],
      ['r21','student-9','e1'],['r22','student-10','e5'],['r23','student-11','e6'],['r24','student-12','e1'],
      ['r25','student-9','e3'],['r26','student-3','e8'],['r27','student-10','e9'],['r28','student-11','e4'],
      ['r29','student-12','e5'],['r30','student-7','e1'],['r31','student-6','e4'],['r32','student-4','e9'],
    ];
    for (const r of regs) await insertReg.run(...r);

    const insertAdmin = db.prepare('INSERT INTO admins (id, name, email, password, department, access_level, phone) VALUES (?, ?, ?, ?, ?, ?, ?)');
    await insertAdmin.run('adm-1', 'System Admin', 'sysadmin@nu.edu.pk', 'admin123', 'IT Administration', 'FULL', '0300-1111111');
    await insertAdmin.run('adm-2', 'Dr. Sarah Khan', 'sarah.khan@nu.edu.pk', 'admin123', 'Student Affairs', 'FULL', '0301-2222222');
    await insertAdmin.run('adm-3', 'Prof. Ahmed Raza', 'ahmed.raza@nu.edu.pk', 'admin123', 'Academic Affairs', 'FULL', '0302-3333333');
    await insertAdmin.run('adm-4', 'Syed Kamran', 'kamran@nu.edu.pk', 'admin123', 'IT Administration', 'LIMITED', '0303-4444444');
    await insertAdmin.run('adm-5', 'Nadia Ashraf', 'nadia.a@nu.edu.pk', 'admin123', 'Student Affairs', 'LIMITED', '0304-5555555');

    const insertHead = db.prepare('INSERT INTO heads (id, name, email, password, society_id, department, phone, tenure_start) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    await insertHead.run('hd-1', 'Hassan Ali', 'hassan.ali@nu.edu.pk', 'pass123', 's1', 'Computer Science', '0310-1234567', '2025-09-01');
    await insertHead.run('hd-2', 'Zainab Sheikh', 'zainab.s@nu.edu.pk', 'pass123', 's2', 'Civil Engineering', '0311-2345678', '2025-09-01');
    await insertHead.run('hd-3', 'Omer Farooq', 'omer.f@nu.edu.pk', 'pass123', 's3', 'Computer Science', '0312-3456789', '2025-09-01');
    await insertHead.run('hd-4', 'Ayesha Malik', 'ayesha.m@nu.edu.pk', 'pass123', 's4', 'Computer Science', '0313-4567890', '2025-10-01');
    await insertHead.run('hd-5', 'Bilal Khan', 'bilal.k@nu.edu.pk', 'pass123', 's5', 'Electrical Engineering', '0314-5678901', '2025-09-01');
    await insertHead.run('hd-6', 'Fatima Noor', 'fatima.n@nu.edu.pk', 'pass123', 's6', 'Computer Science', '0315-6789012', '2025-10-01');

    const insertCoHead = db.prepare('INSERT INTO co_heads (id, name, email, password, society_id, department, phone, tenure_start) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    await insertCoHead.run('ch-1', 'Rizwan Ahmed', 'rizwan.a@nu.edu.pk', 'pass123', 's1', 'Computer Science', '0320-1111111', '2025-09-01');
    await insertCoHead.run('ch-2', 'Mariam Qureshi', 'mariam.q@nu.edu.pk', 'pass123', 's2', 'Civil Engineering', '0321-2222222', '2025-09-01');
    await insertCoHead.run('ch-3', 'Saad Afridi', 'saad.a@nu.edu.pk', 'pass123', 's3', 'Computer Science', '0322-3333333', '2025-09-01');
    await insertCoHead.run('ch-4', 'Kiran Shah', 'kiran.s@nu.edu.pk', 'pass123', 's4', 'Electrical Engineering', '0323-4444444', '2025-10-01');
    await insertCoHead.run('ch-5', 'Tariq Mehmood', 'tariq.m@nu.edu.pk', 'pass123', 's5', 'Mechanical Engineering', '0324-5555555', '2025-09-01');
    await insertCoHead.run('ch-6', 'Amna Hassan', 'amna.h@nu.edu.pk', 'pass123', 's6', 'Business Administration', '0325-6666666', '2025-10-01');

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
  initialized = true;
}
