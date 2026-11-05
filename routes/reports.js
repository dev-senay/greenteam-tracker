import { Router } from 'express';
import pool from '../db.js';
import { requireRole } from '../middleware/auth.js';
import { sendOverdueReminders } from '../utils/reminders.js';

const router = Router();

// GET /api/reports/groups  (leader: own group, admin: all groups)
router.get('/groups', requireRole('leader', 'admin'), async (req, res) => {
    const groupId = req.user.role === 'leader' ? req.user.group_id : null;

    const { rows } = await pool.query(`
    WITH last AS (
      SELECT DISTINCT ON (plant_id) plant_id, watered_at, health
      FROM waterings
      ORDER BY plant_id, watered_at DESC
    )
    SELECT g.id, g.name_en, g.name_am,
      COUNT(p.id)::int AS total,
      COUNT(*) FILTER (WHERE l.health = 'healthy')::int AS healthy,
      COUNT(*) FILTER (WHERE l.health = 'needs_attention')::int AS needs_attention,
      COUNT(*) FILTER (WHERE l.health = 'critical')::int AS critical,
      COUNT(*) FILTER (WHERE p.id IS NOT NULL
        AND (l.watered_at IS NULL OR l.watered_at < now() - interval '7 days'))::int AS overdue
    FROM groups g
    LEFT JOIN plants p ON p.group_id = g.id
    LEFT JOIN last l ON l.plant_id = p.id
    WHERE ($1::int IS NULL OR g.id = $1)
    GROUP BY g.id
    ORDER BY g.id
  `, [groupId]);

    res.json(rows);
});

// POST /api/reports/remind  (admin: send reminders now)
router.post('/remind', requireRole('admin'), async (req, res) => {
    res.json(await sendOverdueReminders());
});

export default router;