const BUILD_ID = typeof __APP_BUILD_ID__ !== 'undefined' ? String(__APP_BUILD_ID__) : 'dev';

const CHUNK_ERROR_PATTERNS = [
  'failed to fetch dynamically imported module',
  'importing a module script failed',
  'loading chunk',
  'chunkloaderror',
];

const RECOVERY_QUERY_KEY = '__app_build';
const BUILD_STORAGE_SUFFIX = 'build-id';
const RECOVERY_STORAGE_SUFFIX = 'recovery';

const getStorageKey = (scope, suffix) => `${scope}:${suffix}`;

const stripRecoveryQuery = () => {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has(RECOVERY_QUERY_KEY) && !url.searchParams.has('__reason')) return;
  url.searchParams.delete(RECOVERY_QUERY_KEY);
  url.searchParams.delete('__reason');
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
};

const clearBrowserCaches = async () => {
  if (typeof window === 'undefined') return;

  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations().catch(() => []);
    await Promise.allSettled(registrations.map((registration) => registration.unregister()));
  }

  if ('caches' in window) {
    const keys = await caches.keys().catch(() => []);
    await Promise.allSettled(keys.map((key) => caches.delete(key)));
  }
};

const isRecoverableChunkError = (message) => {
  const normalized = String(message || '').toLowerCase();
  return CHUNK_ERROR_PATTERNS.some((pattern) => normalized.includes(pattern));
};

const recoverToLatestBuild = async (scope, reason) => {
  if (typeof window === 'undefined') return;

  const recoveryKey = getStorageKey(scope, `${RECOVERY_STORAGE_SUFFIX}:${BUILD_ID}`);
  if (window.sessionStorage.getItem(recoveryKey) === '1') return;

  window.sessionStorage.setItem(recoveryKey, '1');
  localStorage.setItem(getStorageKey(scope, BUILD_STORAGE_SUFFIX), BUILD_ID);

  await clearBrowserCaches();

  const url = new URL(window.location.href);
  url.searchParams.set(RECOVERY_QUERY_KEY, BUILD_ID);
  if (reason) {
    url.searchParams.set('__reason', String(reason).slice(0, 32));
  }
  window.location.replace(url.toString());
};

export const installAppVersionGuards = (scope) => {
  if (typeof window === 'undefined') return;

  stripRecoveryQuery();

  const buildKey = getStorageKey(scope, BUILD_STORAGE_SUFFIX);
  const previousBuildId = localStorage.getItem(buildKey);
  if (!previousBuildId) {
    localStorage.setItem(buildKey, BUILD_ID);
  } else if (previousBuildId !== BUILD_ID) {
    void recoverToLatestBuild(scope, 'build-update');
    return;
  }

  const handleChunkRecovery = (event) => {
    const message = String(
      event?.reason?.message
      || event?.error?.message
      || event?.message
      || ''
    );
    if (!isRecoverableChunkError(message)) return;
    event?.preventDefault?.();
    void recoverToLatestBuild(scope, 'chunk-reload');
  };

  window.addEventListener('vite:preloadError', handleChunkRecovery);
  window.addEventListener('error', handleChunkRecovery);
  window.addEventListener('unhandledrejection', handleChunkRecovery);
};

export const getAppBuildId = () => BUILD_ID;



