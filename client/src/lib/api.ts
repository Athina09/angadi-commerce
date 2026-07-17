import axios from "axios";

const baseURL =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ||
  "http://localhost:4000";

if (!import.meta.env.VITE_API_URL) {
  console.warn("VITE_API_URL is not set — falling back to http://localhost:4000");
}

export const API_BASE_URL = baseURL;

export const api = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
  timeout: 20000,
});

api.interceptors.request.use((config) => {
  const url = config.url ?? "";
  // Never attach stale JWT to auth endpoints
  if (url.includes("/auth/login") || url.includes("/auth/register")) {
    if (config.headers) {
      delete config.headers.Authorization;
    }
    return config;
  }
  const token = localStorage.getItem("ngc_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/** Direct fetch login — avoids axios/CORS edge cases in demo */
export async function loginRequest(body: {
  email: string;
  password: string;
  role?: string;
}): Promise<{ user: unknown; token: string; demo?: boolean }> {
  const attempts = [
    baseURL,
    "http://localhost:4000",
    "http://127.0.0.1:4000",
  ].filter((v, i, a) => a.indexOf(v) === i);

  let lastErr: unknown;
  for (const base of attempts) {
    try {
      const res = await fetch(`${base}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as {
        user?: unknown;
        token?: string;
        error?: string;
        demo?: boolean;
      };
      if (!res.ok) {
        throw Object.assign(new Error(data.error || "Login failed"), {
          response: { status: res.status, data },
        });
      }
      if (!data.token || !data.user) {
        throw new Error("Login response incomplete");
      }
      return { user: data.user, token: data.token, demo: data.demo };
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr instanceof Error
    ? lastErr
    : new Error("Cannot reach API on :4000");
}
