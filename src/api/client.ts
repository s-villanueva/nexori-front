const BASE: string = (import.meta.env.VITE_API_URL as string) ;

function getToken(): string | null {
  return localStorage.getItem('b2b_token');
}

interface RequestOptions extends Omit<RequestInit, 'headers'> {
  headers?: Record<string, string>;
}

async function request<T = any>(path: string, options: RequestOptions = {}): Promise<T | null> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(`${BASE}${path}`, { 
    ...options, 
    headers 
  });

  if (res.status === 204) return null;

  const text = await res.text();

  if (!res.ok) {
    let msg = text;
    try { 
      msg = JSON.parse(text)?.message || text; 
    } catch {
      // JSON parsing failed, fallback to raw text
    }
    throw new Error(msg || `HTTP ${res.status}`);
  }

  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}

export const api = {
  get:    <T = any>(path: string) => 
    request<T>(path),
  post:   <T = any>(path: string, body: unknown) => 
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put:    <T = any>(path: string, body: unknown) => 
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T = any>(path: string) => 
    request<T>(path, { method: 'DELETE' }),
  postForm: <T = any>(path: string, formData: FormData) =>
    request<T>(path, { method: 'POST', body: formData }),
};

export function setToken(token: string | null): void {
  if (token) {
    localStorage.setItem('b2b_token', token);
  } else {
    localStorage.removeItem('b2b_token');
  }
}

export interface JwtPayload {
  jti?: string | number;
  sub?: string | number;
  exp: number;
  [key: string]: any;
}

export function decodeJwt(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(b64)) as JwtPayload;
  } catch {
    return null;
  }
}