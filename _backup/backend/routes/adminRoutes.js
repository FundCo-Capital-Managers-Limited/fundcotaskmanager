import express from 'express';
import jwt from 'jsonwebtoken';
import Admin from '../models/adminModel.js';

const router = express.Router();

router.post('/verify', async (req, res) => {
    const { token } = req.body;
    if (!token) {
        return res.status(400).json({ success: false, message: 'Token is required' });
    }

    try {
        const decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET);
        const admin = await Admin.findById(decoded.id).select('role isActive');
        if (!admin || !admin.isActive) {
            return res.status(401).json({ success: false, message: 'Invalid or inactive admin account' });
        }
        res.json({
            success: true,
            admin: { id: decoded.id, role: admin.role, email: admin.email },
        });
    } catch (err) {
        console.error('Admin token verification error:', err.message);
        if (err.name === 'JsonWebTokenError') {
            return res.status(401).json({ success: false, message: 'Invalid token' });
        }
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ success: false, message: 'Token expired' });
        }
        res.status(500).json({ success: false, message: 'Server error during token verification' });
    }
});

export default router;