import pool from '../db.js';
import { sendTelegram } from './telegram.js';

const MAX_LEN = 3500; // Telegram limit is 4096 characters

export async function sendOverdueReminders() {
    const { rows } = await pool.query(`
    SELECT g.id AS group_id, g.name_en, g.name_am, g.telegram_chat_id,
           p.name AS plant, u.full_name AS owner
    FROM groups g
    JOIN plants p ON p.group_id = g.id
    JOIN users u ON u.id = p.owner_id
    LEFT JOIN waterings w ON w.plant_id = p.id
    WHERE g.telegram_chat_id IS NOT NULL
    GROUP BY g.id, p.id, u.id
    HAVING MAX(w.watered_at) IS NULL
        OR MAX(w.watered_at) < now() - interval '7 days'
    ORDER BY g.id, u.full_name, p.name
  `);

    // group rows: group -> owner -> plants
    const groups = new Map();
    for (const r of rows) {
        if (!groups.has(r.group_id)) groups.set(r.group_id, { info: r, owners: new Map() });
        const owners = groups.get(r.group_id).owners;
        if (!owners.has(r.owner)) owners.set(r.owner, []);
        owners.get(r.owner).push(r.plant);
    }

    let sent = 0;
    const failed = [];

    for (const { info, owners } of groups.values()) {
        const header = `🌱 ${info.name_en} / ${info.name_am}\n💧 Plants that need water / ውሃ የሚያስፈልጋቸው ዕፅዋት:\n`;
        const lines = [...owners].map(([owner, plants]) => `• ${owner}: ${plants.join(', ')}`);

        // split into several messages if too long
        const messages = [];
        let current = header;
        for (const line of lines) {
            if ((current + line).length > MAX_LEN) { messages.push(current); current = header; }
            current += line + '\n';
        }
        messages.push(current);

        try {
            for (const m of messages) await sendTelegram(info.telegram_chat_id, m);
            sent++;
        } catch (err) {
            failed.push({ group: info.name_en, error: err.message });
        }
    }

    return { sent, failed };
}