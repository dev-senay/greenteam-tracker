import 'dotenv/config';
import { Router } from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import AppError from '../utils/AppError.js';
import { requireRole } from '../middleware/auth.js';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    fileFilter: (req, file, cb) =>
        file.mimetype.startsWith('image/') ? cb(null, true) : cb(new AppError('Only images are allowed', 400))
});

const router = Router();

// POST /api/uploads  (form-data, field name: photo)
router.post('/', requireRole('leader', 'admin'), upload.single('photo'), async (req, res) => {
    if (!req.file) throw new AppError('No photo received', 400);

    const result = await new Promise((resolve, reject) => {
        cloudinary.uploader
            .upload_stream({ folder: 'greenteam', resource_type: 'image' }, (err, r) => (err ? reject(err) : resolve(r)))
            .end(req.file.buffer);
    });

    res.status(201).json({ url: result.secure_url });
});

export default router;