const normalizeBase = (value) => String(value || '').trim().replace(/\/+$/, '');

const resolveUserApiBase = () => {
  const explicitBase =
    process.env.USER_API_URL ||
    process.env.SHARED_USER_API_URL ||
    process.env.PRODUCTION_USER_API_URL;

  if (explicitBase) return explicitBase;

  return (process.env.NODE_ENV || '').toLowerCase() === 'production'
    ? 'https://negtm.onrender.com'
    : 'http://127.0.0.1:4001';
};

const RAW_USER_API_BASE = normalizeBase(resolveUserApiBase());

const getCandidateBases = (value) => {
  try {
    const url = new URL(value);
    const candidates = [];

    const pushCandidate = (hostname) => {
      const nextUrl = new URL(url.toString());
      nextUrl.hostname = hostname;
      candidates.push(nextUrl.toString().replace(/\/+$/, ''));
    };

    pushCandidate(url.hostname);
    if (url.hostname === 'localhost') pushCandidate('127.0.0.1');
    if (url.hostname === '127.0.0.1') pushCandidate('localhost');

    return [...new Set(candidates)];
  } catch {
    return [String(value || '').replace(/\/+$/, '')].filter(Boolean);
  }
};

const USER_API_BASES = getCandidateBases(RAW_USER_API_BASE);

const buildTargetUrl = (originalUrl, sourceBasePath, baseUrl) => {
  if (!originalUrl.startsWith(sourceBasePath)) {
    throw new Error(`Cannot proxy request outside ${sourceBasePath}`);
  }

  const nextPath = originalUrl.slice(sourceBasePath.length) || '/';
  return `${baseUrl}${nextPath}`;
};

const copyHeaders = (req, isMultipart, hasJsonBody) => {
  const headers = {};
  for (const [key, value] of Object.entries(req.headers || {})) {
    if (!value) continue;
    const lower = key.toLowerCase();
    if (lower === 'host' || lower === 'connection' || lower === 'content-length') continue;
    headers[key] = value;
  }

  if (hasJsonBody) {
    headers['content-type'] = req.headers['content-type'] || 'application/json';
  }

  return headers;
};

export const createUserBackendProxy = (sourceBasePath) => async (req, res) => {
  const method = (req.method || 'GET').toUpperCase();
  const contentType = String(req.headers['content-type'] || '');
  const isMultipart = contentType.toLowerCase().startsWith('multipart/form-data');
  const hasJsonBody =
    !isMultipart &&
    !['GET', 'HEAD'].includes(method) &&
    req.body &&
    Object.keys(req.body).length > 0;

  const headers = copyHeaders(req, isMultipart, hasJsonBody);
  const lastErrorByBase = [];

  for (const baseUrl of USER_API_BASES) {
    try {
      const targetUrl = buildTargetUrl(req.originalUrl, sourceBasePath, baseUrl);
      const options = {
        method,
        headers,
        redirect: 'manual',
      };

      if (!['GET', 'HEAD'].includes(method)) {
        if (isMultipart) {
          options.body = req;
          options.duplex = 'half';
        } else if (hasJsonBody) {
          options.body = JSON.stringify(req.body);
        }
      }

      const response = await fetch(targetUrl, options);
      const responseType = response.headers.get('content-type');
      const payload = await response.text();

      if (responseType) {
        res.set('content-type', responseType);
      }

      res.status(response.status);
      if (response.status === 204 || response.status === 304) {
        return res.end();
      }

      return res.send(payload);
    } catch (error) {
      lastErrorByBase.push(`${baseUrl} -> ${error.message}`);
    }
  }

  console.error('Shared proxy error:', lastErrorByBase.join(' | '));
  return res.status(502).json({
    success: false,
    message: 'Failed to reach shared service',
  });
};

