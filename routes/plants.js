import { Router } from 'express';
import pool from '../db.js';
import AppError from '../utils/AppError.js';

const router = Router();
// leaders are forced to their own group; admin may choose any
function scopedGroupId(req) {
    if (req.user.role === 'leader') return req.user.group_id;
    const { group_id } = req.query;
    if (!group_id) return null;
    if (!Number.isInteger(Number(group_id))) throw new AppError('group_id must be a number', 400);
    return Number(group_id);
}

// GET /api/plants?group_id=1   -> plants with last watering info
router.get('/', async (req, res) => {
    const groupId = scopedGroupId(req);
    const params = [];
    let where = '';            // in /overdue this variable is called "extra"
    if (groupId) {
        params.push(groupId);
        where = 'WHERE p.group_id = $1';   // in /overdue: 'AND p.group_id = $1'
    }

    const { rows } = await pool.query(`
    SELECT p.id, p.name, p.species, p.group_id,
           u.full_name AS owner,
           lw.watered_at AS last_watered,
           lw.health AS last_health
    FROM plants p
    JOIN users u ON u.id = p.owner_id
    LEFT JOIN LATERAL (
      SELECT watered_at, health
      FROM waterings w
      WHERE w.plant_id = p.id
      ORDER BY watered_at DESC
      LIMIT 1
    ) lw ON true
    ${where}
    ORDER BY p.id
  `, params);

    res.json(rows);
});

// GET /api/plants/overdue?group_id=1  -> not watered in the last 7 days
router.get('/overdue', async (req, res) => {
    const groupId = scopedGroupId(req);
    const params = [];
    let where = '';            // in /overdue this variable is called "extra"
    if (groupId) {
        params.push(groupId);
        where = 'WHERE p.group_id = $1';   // in /overdue: 'AND p.group_id = $1'
    }

    const { rows } = await pool.query(`
    SELECT p.id, p.name, p.group_id, u.full_name AS owner,
           MAX(w.watered_at) AS last_watered
    FROM plants p
    JOIN users u ON u.id = p.owner_id
    LEFT JOIN waterings w ON w.plant_id = p.id
    WHERE true ${extra}
    GROUP BY p.id, u.full_name
    HAVING MAX(w.watered_at) IS NULL
        OR MAX(w.watered_at) < now() - interval '7 days'
    ORDER BY last_watered ASC NULLS FIRST
  `, params);

    res.json(rows);
});

// GET /api/plants/:id  -> one plant with full watering history
router.get('/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw new AppError('Invalid plant id', 400);

    const plant = await pool.query(`
    SELECT p.*, u.full_name AS owner
    FROM plants p JOIN users u ON u.id = p.owner_id
    WHERE p.id = $1
  `, [id]);
    if (!plant.rows.length) throw new AppError('Plant not found', 404);
    const p = plant.rows[0];
    if (req.user.role === 'leader' && p.group_id !== req.user.group_id) {
        throw new AppError('This plant belongs to another group', 403);
    }
    const history = await pool.query(`
    SELECT w.id, w.watered_at, w.health, w.note, w.photo_url, u.full_name AS watered_by
    FROM waterings w JOIN users u ON u.id = w.user_id
    WHERE w.plant_id = $1
    ORDER BY w.watered_at DESC
  `, [id]);

    res.json({ ...plant.rows[0], history: history.rows });
});

export default router;