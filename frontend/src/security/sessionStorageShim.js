const TOKEN_KEY = 'token';
const USER_ID_KEY = 'userId';
const SENSITIVE_KEYS = new Set([TOKEN_KEY, USER_ID_KEY]);

let installed = false;

export const installSensitiveStorageShim = () => {
  if (installed || typeof window === 'undefined' || !window.localStorage || !window.sessionStorage) {
    return;
  }
  installed = true;

  const originalGetItem = Storage.prototype.getItem;
  const originalSetItem = Storage.prototype.setItem;
  const originalRemoveItem = Storage.prototype.removeItem;
  const originalClear = Storage.prototype.clear;

  const migrateIfNeeded = (key) => {
    if (!SENSITIVE_KEYS.has(key)) return;
    const sessionValue = originalGetItem.call(window.sessionStorage, key);
    if (sessionValue !== null) return;
    const legacyValue = originalGetItem.call(window.localStorage, key);
    if (legacyValue !== null) {
      originalSetItem.call(window.sessionStorage, key, legacyValue);
      originalRemoveItem.call(window.localStorage, key);
    }
  };

  Storage.prototype.getItem = function patchedGetItem(key) {
    if (this === window.localStorage && SENSITIVE_KEYS.has(String(key))) {
      migrateIfNeeded(String(key));
      return originalGetItem.call(window.sessionStorage, key);
    }
    return originalGetItem.call(this, key);
  };

  Storage.prototype.setItem = function patchedSetItem(key, value) {
    if (this === window.localStorage && SENSITIVE_KEYS.has(String(key))) {
      originalSetItem.call(window.sessionStorage, key, value);
      originalRemoveItem.call(window.localStorage, key);
      return;
    }
    return originalSetItem.call(this, key, value);
  };

  Storage.prototype.removeItem = function patchedRemoveItem(key) {
    if (this === window.localStorage && SENSITIVE_KEYS.has(String(key))) {
      originalRemoveItem.call(window.sessionStorage, key);
      return originalRemoveItem.call(window.localStorage, key);
    }
    return originalRemoveItem.call(this, key);
  };

  Storage.prototype.clear = function patchedClear() {
    if (this === window.localStorage) {
      for (const key of SENSITIVE_KEYS) {
        originalRemoveItem.call(window.sessionStorage, key);
      }
    }
    return originalClear.call(this);
  };
};



