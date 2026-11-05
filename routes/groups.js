import { Router } from 'express';
import pool from '../db.js';
import AppError from '../utils/AppError.js';


const router = Router();

// GET /api/groups  -> all groups with plant counts
router.get('/', async (req, res) => {
    const { rows } = await pool.query(`
    SELECT g.id, g.name_en, g.name_am, g.location,
           COUNT(p.id)::int AS plant_count
    FROM groups g
    LEFT JOIN plants p ON p.group_id = g.id
    GROUP BY g.id
    ORDER BY g.id
  `);
    res.json(rows);
});


// GET /api/groups/:id/members -> students and leader of one group
router.get('/:id/members', async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw new AppError('Invalid group id', 400);
    if (req.user.role === 'student') throw new AppError('You do not have permission', 403);
    if (req.user.role === 'leader' && req.user.group_id !== id) {
        throw new AppError('This is not your group', 403);
    }

    const { rows } = await pool.query(
        `SELECT id, full_name, role FROM users
     WHERE group_id = $1 AND role IN ('leader', 'student')
     ORDER BY full_name`,
        [id]
    );
    res.json(rows);
});

export default router;