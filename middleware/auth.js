import jwt from 'jsonwebtoken';
import AppError from '../utils/AppError.js';

export function requireAuth(req, res, next) {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw new AppError('Please log in', 401);

    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET); // { id, role, group_id }
        next();
    } catch {
        throw new AppError('Session expired, please log in again', 401);
    }
}

export function requireRole(...roles) {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) throw new AppError('You do not have permission', 403);
        next();
    };
}