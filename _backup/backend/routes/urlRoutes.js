import express from 'express';
import { nanoid } from 'nanoid';
import validator from 'validator';
import rateLimit from 'express-rate-limit';
import Url from '../models/url.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// Rate limiter: 100 requests per 15 minutes per IP.
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { success: false, message: 'Too many requests, please try again later.' },
});

// Shorten URL
router.post('/shorten', authMiddleware, limiter, async (req, res, next) => {
    const { longUrl } = req.body;
    const userId = req.user.id;

    console.log('Received longUrl:', longUrl); // Debug log
    if (!longUrl) {
        return res.status(400).json({ success: false, message: 'Long URL is required.' });
    }

    if (!validator.isURL(longUrl, { require_protocol: true })) {
        return res.status(400).json({ success: false, message: 'Invalid URL.' });
    }

    try {
        let url = await Url.findOne({ longUrl, userId });
        if (url) {
            return res.json({
                success: true,
                shortUrl: `${process.env.BASE_URL}/${url.shortCode}`,
            });
        }

        const shortCode = nanoid(6);
        url = new Url({
            shortCode,
            longUrl,
            userId,
        });

        await url.save();
        console.log('Saved URL:', { shortCode, longUrl }); // Debug log
        res.json({
            success: true,
            shortUrl: `${process.env.BASE_URL}/${url.shortCode}`,
        });
    } catch (error) {
        next(error);
    }
});

// List user's URLs
router.get('/list', authMiddleware, async (req, res, next) => {
    try {
        const urls = await Url.find({ userId: req.user.id }).sort({ createdAt: -1 });
        res.json({
            success: true,
            urls: urls.map((url) => ({
                _id: url._id,
                shortUrl: `${process.env.BASE_URL}/${url.shortCode}`,
                longUrl: url.longUrl,
                clicks: url.clicks,
                createdAt: url.createdAt,
            })),
        });
    } catch (error) {
        next(error);
    }
});

// Delete URL
router.delete('/:id', authMiddleware, async (req, res, next) => {
    try {
        const url = await Url.findOne({ _id: req.params.id, userId: req.user.id });
        if (!url) {
            return res.status(400).json({ success: false, message: 'URL not found.' });
        }
        await url.deleteOne();
        res.json({ success: true, message: 'URL deleted.' });
    } catch (error) {
        next(error);
    }
});

// Redirect short URL
router.get('/:shortCode', async (req, res, next) => {
    try {
        const url = await Url.findOne({ shortCode: req.params.shortCode });
        if (!url) {
            console.log('Short code not found:', req.params.shortCode); // Debug log
            return res.status(404).json({ success: false, message: 'URL not found.' });
        }
        console.log('Redirecting to:', url.longUrl); // Debug log
        url.clicks += 1;
        await url.save();
        res.redirect(302, url.longUrl);
    } catch (error) {
        next(error);
    }
});

export default router;