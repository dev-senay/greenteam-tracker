import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';

const ADMIN_EMAIL = 'admin@greenteam.app';
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const newPass = () => crypto.randomBytes(6).toString('base64url');

// students from CSV
const students = {};
if (existsSync(new URL('./students.csv', import.meta.url))) {
    const text = await readFile(new URL('./students.csv', import.meta.url), 'utf8');
    for (const line of text.split(/\r?\n/)) {
        const [g, ...rest] = line.split(',');
        const name = rest.join(',').trim();
        if (!/^[1-6]$/.test(g.trim()) || !name) continue;
        (students[g.trim()] ||= []).push(name);
    }
}

const creds = [];
let sql = '';

sql += `INSERT INTO groups (name_en, name_am, location) VALUES\n`;
sql += [1, 2, 3, 4, 5, 6].map(n => `  ('Team ${n}', 'ቡድን ${n}', 'Campus')`).join(',\n') + ';\n\n';

const adminPass = newPass();
creds.push(`ADMIN   ${ADMIN_EMAIL}   ${adminPass}`);
sql += `INSERT INTO users (full_name, email, password_hash, role) VALUES (${q('Coordinator')}, ${q(ADMIN_EMAIL)}, ${q(await bcrypt.hash(adminPass, 10))}, 'admin');\n\n`;

for (let n = 1; n <= 6; n++) {
    const email = `leader${n}@greenteam.app`;
    const pass = newPass();
    creds.push(`TEAM ${n}  ${email}   ${pass}`);
    const grp = `(SELECT id FROM groups WHERE name_en = 'Team ${n}')`;

    sql += `INSERT INTO users (full_name, email, password_hash, role, group_id) VALUES (${q(`Leader of Team ${n}`)}, ${q(email)}, ${q(await bcrypt.hash(pass, 10))}, 'leader', ${grp});\n`;

    const names = students[n] || [];
    for (let k = 1; k <= Math.max(9, names.length); k++) {
        const name = names[k - 1] || `Student ${n}-${k}`;
        sql += `INSERT INTO users (full_name, role, group_id) VALUES (${q(name)}, 'student', ${grp});\n`;
    }
    sql += '\n';
}

sql += `INSERT INTO plants (name, species, owner_id, group_id)
SELECT 'Plant ' || n,
       (ARRAY['Tomato','Maize','Kale','Pepper','Basil','Mint'])[1 + (n + u.id) % 6],
       u.id, u.group_id
FROM users u, generate_series(1, 10) n
WHERE u.role IN ('leader', 'student');
`;

await writeFile(new URL('./seed.sql', import.meta.url), sql);
await writeFile(new URL('../credentials.txt', import.meta.url), creds.join('\n') + '\n');
console.log('Created db/seed.sql and credentials.txt\n');
console.log(creds.join('\n'));
