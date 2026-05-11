import dns from 'node:dns/promises';
import net from 'node:net';

const PREVIEW_CACHE_TTL_MS = 30 * 60 * 1000;
const PREVIEW_FETCH_TIMEOUT_MS = 7_500;
const MAX_HTML_CHARS = 250_000;
const cache = new Map();

const BLOCKED_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

const collapseWhitespace = (value) => String(value || '').replace(/\s+/g, ' ').trim();

const stripTags = (value) =>
  collapseWhitespace(String(value || '').replace(/<[^>]+>/g, ' '));

const decodeHtml = (value) =>
  String(value || '')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');

const isPrivateIp = (ipAddress) => {
  if (!net.isIP(ipAddress)) return true;
  if (net.isIPv6(ipAddress)) {
    const lower = ipAddress.toLowerCase();
    return lower === '::1' || lower.startsWith('fc') || lower.startsWith('fd') || lower.startsWith('fe80:');
  }

  const parts = ipAddress.split('.').map((part) => Number(part));
  const [a, b] = parts;
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  return false;
};

const ensurePublicHttpUrl = async (rawUrl) => {
  const parsed = new URL(String(rawUrl || '').trim());
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Only http and https links are supported');
  }

  const host = parsed.hostname.toLowerCase();
  if (BLOCKED_HOSTS.has(host) || host.endsWith('.local')) {
    throw new Error('Local addresses are not allowed');
  }

  if (net.isIP(host)) {
    if (isPrivateIp(host)) throw new Error('Private network links are not allowed');
    return parsed.toString();
  }

  const results = await dns.lookup(host, { all: true });
  if (!results.length || results.some((entry) => isPrivateIp(entry.address))) {
    throw new Error('Private network links are not allowed');
  }

  return parsed.toString();
};

const readMeta = (html, key, attribute = 'property') => {
  const expression = new RegExp(
    `<meta[^>]+${attribute}=["']${key}["'][^>]+content=["']([^"']+)["'][^>]*>`,
    'i'
  );
  const reverseExpression = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+${attribute}=["']${key}["'][^>]*>`,
    'i'
  );
  const match = html.match(expression) || html.match(reverseExpression);
  return decodeHtml(stripTags(match?.[1] || ''));
};

const readTitle = (html) => {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return decodeHtml(stripTags(match?.[1] || ''));
};

const inferYoutubeMeta = (url) => {
  const parsed = new URL(url);
  let videoId = '';

  if (parsed.hostname.includes('youtu.be')) {
    videoId = parsed.pathname.replace(/\//g, '').trim();
  } else if (parsed.hostname.includes('youtube.com')) {
    videoId = parsed.searchParams.get('v') || '';
  }

  if (!videoId) return null;
  return {
    provider: 'youtube',
    image: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    embedUrl: `https://www.youtube.com/embed/${videoId}`,
  };
};

const buildFallbackPreview = (url) => {
  const parsed = new URL(url);
  const youtube = inferYoutubeMeta(url);
  return {
    url,
    finalUrl: url,
    title: parsed.hostname.replace(/^www\./i, ''),
    description: '',
    siteName: parsed.hostname.replace(/^www\./i, ''),
    image: youtube?.image || '',
    embedUrl: youtube?.embedUrl || '',
    domain: parsed.hostname.replace(/^www\./i, ''),
    kind: youtube ? 'video' : 'website',
    provider: youtube?.provider || '',
  };
};

const extractPreviewFromHtml = (html, resolvedUrl) => {
  const parsed = new URL(resolvedUrl);
  const youtube = inferYoutubeMeta(resolvedUrl);
  const title =
    readMeta(html, 'og:title') ||
    readMeta(html, 'twitter:title', 'name') ||
    readTitle(html) ||
    parsed.hostname.replace(/^www\./i, '');
  const description =
    readMeta(html, 'og:description') ||
    readMeta(html, 'description', 'name') ||
    readMeta(html, 'twitter:description', 'name');
  const image =
    readMeta(html, 'og:image') ||
    readMeta(html, 'twitter:image', 'name') ||
    youtube?.image ||
    '';
  const siteName =
    readMeta(html, 'og:site_name') ||
    parsed.hostname.replace(/^www\./i, '');

  return {
    url: resolvedUrl,
    finalUrl: resolvedUrl,
    title,
    description,
    siteName,
    image,
    embedUrl: youtube?.embedUrl || '',
    domain: parsed.hostname.replace(/^www\./i, ''),
    kind: youtube ? 'video' : 'website',
    provider: youtube?.provider || '',
  };
};

export const fetchLinkPreview = async (rawUrl) => {
  const safeUrl = await ensurePublicHttpUrl(rawUrl);
  const cached = cache.get(safeUrl);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PREVIEW_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(safeUrl, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        accept: 'text/html,application/xhtml+xml',
        'user-agent': 'FundCoAI-LinkPreview/1.0',
      },
    });

    const resolvedUrl = response.url || safeUrl;
    const contentType = String(response.headers.get('content-type') || '').toLowerCase();
    let preview = buildFallbackPreview(resolvedUrl);

    if (contentType.includes('text/html')) {
      const html = String(await response.text()).slice(0, MAX_HTML_CHARS);
      preview = extractPreviewFromHtml(html, resolvedUrl);
    }

    cache.set(safeUrl, {
      value: preview,
      expiresAt: Date.now() + PREVIEW_CACHE_TTL_MS,
    });

    return preview;
  } finally {
    clearTimeout(timeoutId);
  }
};
