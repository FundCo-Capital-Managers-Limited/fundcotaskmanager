import express from 'express';
import authMiddleware from '../middleware/auth.js';
import { fetchLinkPreview } from '../utils/linkPreview.js';

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  const rawUrl = String(req.query.url || '').trim();
  if (!rawUrl) {
    return res.status(400).json({ success: false, message: 'A url query parameter is required' });
  }

  try {
    const preview = await fetchLinkPreview(rawUrl);
    res.json({ success: true, preview });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message || 'Unable to load link preview' });
  }
});

export default router;
