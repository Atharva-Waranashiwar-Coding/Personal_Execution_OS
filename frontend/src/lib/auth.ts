export const AUTH_STORAGE_KEY = "peos_access_token";
export const AUTH_COOKIE_NAME = "peos_access_token";

function isBrowser() {
  return typeof window !== "undefined";
}

export function getStoredToken() {
  if (!isBrowser()) {
    return null;
  }

  return window.localStorage.getItem(AUTH_STORAGE_KEY);
}

export function setStoredToken(token: string) {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(AUTH_STORAGE_KEY, token);
  document.cookie = `${AUTH_COOKIE_NAME}=${encodeURIComponent(token)}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`;
}

export function clearStoredToken() {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.removeItem(AUTH_STORAGE_KEY);
  document.cookie = `${AUTH_COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; samesite=lax`;
}

export function decodeJwtPayload<T>(token: string) {
  try {
    const [, payload] = token.split(".");
    if (!payload) {
      return null;
    }

    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = window.atob(normalized);
    return JSON.parse(decoded) as T;
  } catch {
    return null;
  }
}

export function getSessionEmail() {
  const token = getStoredToken();

  if (!token || !isBrowser()) {
    return null;
  }

  const payload = decodeJwtPayload<{ sub?: string }>(token);
  return payload?.sub ?? null;
}

export function isAuthenticated() {
  return Boolean(getStoredToken());
}
