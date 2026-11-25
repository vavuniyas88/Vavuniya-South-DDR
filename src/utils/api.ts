export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').trim().replace(/\/+$/, '');

function resolveApiUrl(url: string): string {
  if (!API_BASE_URL || !url.startsWith('/')) {
    return url;
  }
  return `${API_BASE_URL}${url}`;
}

export async function apiFetch<T>(
  url: string,
  options: {
    method?: string;
    token?: string | null;
    body?: unknown;
  } = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(resolveApiUrl(url), {
    method: options.method ?? 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const text = await res.text();
  let data: Record<string, unknown> = {};
  if (text) {
    try {
      data = JSON.parse(text) as Record<string, unknown>;
    } catch {
      data = {};
    }
  }

  if (!res.ok) {
    const message =
      typeof data.error === 'string' && data.error.length > 0
        ? data.error
        : `Request failed (${res.status})`;
    throw new ApiError(message, res.status);
  }

  return data as T;
}
