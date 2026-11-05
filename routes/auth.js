import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../db.js';
import AppError from '../utils/AppError.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// POST /api/auth/login  body: { email, password }
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) throw new AppError('Email and password are required', 400);

    const { rows } = await pool.query(
        `SELECT id, full_name, email, password_hash, role, group_id
     FROM users WHERE email = $1 AND password_hash IS NOT NULL`,
        [email.trim().toLowerCase()]
    );
    const user = rows[0];

    // same message for wrong email or wrong password
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
        throw new AppError('Wrong email or password', 401);
    }

    const token = jwt.sign(
        { id: user.id, role: user.role, group_id: user.group_id },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );

    res.json({
        token,
        user: { id: user.id, full_name: user.full_name, role: user.role, group_id: user.group_id }
    });
});

// GET /api/auth/me  -> who am I?
router.get('/me', requireAuth, async (req, res) => {
    const { rows } = await pool.query(
        'SELECT id, full_name, email, role, group_id FROM users WHERE id = $1',
        [req.user.id]
    );
    if (!rows.length) throw new AppError('User not found', 404);
    res.json(rows[0]);
});

export default router;