import { Router } from 'express';
import pool from '../db.js';
import AppError from '../utils/AppError.js';

const router = Router();

// GET /api/public/report -> one row per group
router.get('/report', async (req, res) => {
    const { rows } = await pool.query(`
    WITH last AS (
      SELECT DISTINCT ON (plant_id) plant_id, watered_at, health
      FROM waterings ORDER BY plant_id, watered_at DESC
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
    GROUP BY g.id ORDER BY g.id
  `);
    res.json(rows);
});

// GET /api/public/plants?group_id=1
router.get('/plants', async (req, res) => {
    const groupId = Number(req.query.group_id);
    if (!Number.isInteger(groupId)) throw new AppError('group_id is required', 400);

    const { rows } = await pool.query(`
    SELECT p.id, p.name, p.species, u.full_name AS owner,
           lw.watered_at AS last_watered, lw.health AS last_health
    FROM plants p
    JOIN users u ON u.id = p.owner_id
    LEFT JOIN LATERAL (
      SELECT watered_at, health FROM waterings w
      WHERE w.plant_id = p.id ORDER BY watered_at DESC LIMIT 1
    ) lw ON true
    WHERE p.group_id = $1
    ORDER BY p.id
  `, [groupId]);
    res.json(rows);
});

// GET /api/public/plants/:id -> watering history
router.get('/plants/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw new AppError('Invalid plant id', 400);

    const { rows } = await pool.query(`
    SELECT w.watered_at, w.health, w.note, w.photo_url, u.full_name AS watered_by
    FROM waterings w JOIN users u ON u.id = w.user_id
    WHERE w.plant_id = $1
    ORDER BY w.watered_at DESC
  `, [id]);
    res.json(rows);
});

export default router;