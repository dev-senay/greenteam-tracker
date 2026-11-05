import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import bcrypt from 'bcryptjs';
import pool from '../db.js';

const schema = await readFile(new URL('./schema.sql', import.meta.url), 'utf8');
await pool.query(schema);
console.log('Tables created');

// 6 groups
await pool.query(`
  INSERT INTO groups (name_en, name_am, location)
  SELECT 'Team ' || n, 'ቡድን ' || n, 'Campus Zone ' || n
  FROM generate_series(1, 6) n
`);

// 1 admin
const adminHash = await bcrypt.hash('admin123', 10);
await pool.query(
    `INSERT INTO users (full_name, email, password_hash, role)
   VALUES ('Coordinator', 'admin@greenteam.test', $1, 'admin')`,
    [adminHash]
);

// 1 leader per group
const leaderHash = await bcrypt.hash('leader123', 10);
const { rows: groups } = await pool.query('SELECT id FROM groups ORDER BY id');
for (const g of groups) {
    await pool.query(
        `INSERT INTO users (full_name, email, password_hash, role, group_id)
     VALUES ($1, $2, $3, 'leader', $4)`,
        [`Leader of Team ${g.id}`, `leader${g.id}@greenteam.test`, leaderHash, g.id]
    );
}

// 9 students per group (no login)
await pool.query(`
  INSERT INTO users (full_name, role, group_id)
  SELECT 'Student ' || g.id || '-' || s, 'student', g.id
  FROM groups g, generate_series(1, 9) s
`);

// 10 plants for every leader and student (600 total)
await pool.query(`
  INSERT INTO plants (name, species, owner_id, group_id)
  SELECT 'Plant ' || n,
         (ARRAY['Tomato','Maize','Kale','Pepper','Basil','Mint'])[1 + (n + u.id) % 6],
         u.id,
         u.group_id
  FROM users u, generate_series(1, 10) n
  WHERE u.role IN ('leader', 'student')
`);

// one test watering per plant, 0 to 12 days ago
await pool.query(`
  INSERT INTO waterings (plant_id, user_id, watered_at, health)
  SELECT p.id,
         p.owner_id,
         now() - random() * 12 * interval '1 day',
         (ARRAY['healthy','healthy','healthy','needs_attention','critical'])[1 + floor(random() * 5)::int]
  FROM plants p
`);

// quick check
for (const t of ['groups', 'users', 'plants', 'waterings']) {
    const { rows } = await pool.query(`SELECT COUNT(*) FROM ${t}`);
    console.log(`${t}: ${rows[0].count}`);
}

await pool.end();