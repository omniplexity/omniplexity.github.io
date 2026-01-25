const ACCESS_TOKEN_KEY = "omni.accessToken";
const CSRF_TOKEN_KEY = "omni.csrfToken";

let accessToken: string | null = localStorage.getItem(ACCESS_TOKEN_KEY);
let csrfToken: string | null = localStorage.getItem(CSRF_TOKEN_KEY);

export function setAccessToken(token: string | null) {
  accessToken = token;
  if (token) {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  }
}

export function getAccessToken() {
  return accessToken;
}

export function clearAccessToken() {
  setAccessToken(null);
}

export function setCsrfToken(token: string | null) {
  csrfToken = token;
  if (token) {
    localStorage.setItem(CSRF_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(CSRF_TOKEN_KEY);
  }
}

export function getCsrfToken() {
  return csrfToken;
}

export function clearCsrfToken() {
  setCsrfToken(null);
}

export function clearAuth() {
  setAccessToken(null);
  setCsrfToken(null);
}
