import rateLimit from 'express-rate-limit';

const jsonMessage = (message) => ({
  success: false,
  message,
});

export const adminAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonMessage('Too many authentication attempts. Please try again later.'),
});

export const adminPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonMessage('Too many password attempts. Please try again later.'),
});

export const adminRefreshLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonMessage('Too many session refresh attempts. Please try again later.'),
});



