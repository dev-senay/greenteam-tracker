import { Router } from 'express';
import pool from '../db.js';
import AppError from '../utils/AppError.js';
import { requireRole } from '../middleware/auth.js';

const router = Router();
const HEALTH = ['healthy', 'needs_attention', 'critical'];

// POST /api/waterings  (leader or admin)
// body: { plant_id, health, note?, photo_url?, watered_by? }
router.post('/', requireRole('leader', 'admin'), async (req, res) => {
    const { plant_id, health, note, photo_url, watered_by, watered_at } = req.body;
    if (!Number.isInteger(plant_id)) throw new AppError('plant_id must be a number', 400);
    if (!HEALTH.includes(health)) {
        throw new AppError(`health must be one of: ${HEALTH.join(', ')}`, 400);
    }

    const plant = await pool.query('SELECT id, group_id FROM plants WHERE id = $1', [plant_id]);
    if (!plant.rows.length) throw new AppError('Plant not found', 404);
    const groupId = plant.rows[0].group_id;

    if (req.user.role === 'leader' && groupId !== req.user.group_id) {
        throw new AppError('You can only log plants of your own group', 403);
    }

    // who did the watering? default: the logged-in user
    let userId = req.user.id;
    if (watered_by !== undefined) {
        if (!Number.isInteger(watered_by)) throw new AppError('watered_by must be a number', 400);
        const member = await pool.query(
            'SELECT id FROM users WHERE id = $1 AND group_id = $2',
            [watered_by, groupId]
        );
        if (!member.rows.length) throw new AppError('That student is not in this plant\'s group', 400);
        userId = watered_by;
    }
    // time of watering (offline entries send their own time)
    let wateredAt = new Date();
    if (watered_at !== undefined) {
        wateredAt = new Date(watered_at);
        const age = Date.now() - wateredAt.getTime();
        if (isNaN(wateredAt) || age < -5 * 60 * 1000 || age > 30 * 86400000) {
            throw new AppError('watered_at is not valid', 400);
        }
    }

    const { rows } = await pool.query(`
    INSERT INTO waterings (plant_id, user_id, health, note, photo_url, watered_at)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `, [plant_id, userId, health, note || null, photo_url || null, wateredAt]);

    res.status(201).json(rows[0]);
});

export default router;