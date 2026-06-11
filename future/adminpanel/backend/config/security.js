const requireEnv = (name) => {
  const value = String(process.env[name] || '').trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

export const NODE_ENV = String(process.env.NODE_ENV || 'development').trim().toLowerCase();
export const IS_PRODUCTION = NODE_ENV === 'production';

export const ADMIN_JWT_SECRET = requireEnv('ADMIN_JWT_SECRET');
export const INTERNAL_API_TOKEN = requireEnv('INTERNAL_API_TOKEN');
export const USER_BACKEND_INTERNAL_TOKEN = requireEnv('USER_BACKEND_INTERNAL_TOKEN');

export const assertFutureAdminSecurityEnv = () => {
  const required = [
    'ADMIN_PORT',
    'MONGO_URI',
    'ADMIN_JWT_SECRET',
    'INTERNAL_API_TOKEN',
    'USER_BACKEND_INTERNAL_TOKEN',
    'ADMIN_FRONTEND_URL',
  ];

  const missing = required.filter((key) => !String(process.env[key] || '').trim());
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  const uniqueSecrets = new Set([ADMIN_JWT_SECRET, INTERNAL_API_TOKEN, USER_BACKEND_INTERNAL_TOKEN]);
  if (uniqueSecrets.size !== 3) {
    throw new Error('ADMIN_JWT_SECRET, INTERNAL_API_TOKEN, and USER_BACKEND_INTERNAL_TOKEN must all be different');
  }

  if (String(process.env.JWT_SECRET || '').trim()) {
    throw new Error('Legacy JWT_SECRET is no longer supported. Use ADMIN_JWT_SECRET instead.');
  }
};



