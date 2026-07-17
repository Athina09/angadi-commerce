import { create } from "zustand";
import { api, loginRequest } from "../lib/api";

export type Role = "customer" | "vendor";

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  lat?: number | null;
  lng?: number | null;
  preferredLang?: "en" | "ta";
  createdAt: string;
  vendor?: {
    id: string;
    storeName: string;
    lat: number;
    lng: number;
    verified?: boolean;
  } | null;
};

type AuthState = {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string, role?: Role) => Promise<User>;
  register: (data: {
    name: string;
    email: string;
    password: string;
    role: Role;
  }) => Promise<User>;
  logout: () => void;
  fetchMe: () => Promise<void>;
  clearError: () => void;
};

let authEpoch = 0;

function errorMessage(err: unknown, fallback: string): string {
  const ax = err as {
    code?: string;
    message?: string;
    response?: { status?: number; data?: { error?: string } };
  };
  if (ax?.response?.data?.error) return ax.response.data.error;
  if (
    ax?.code === "ERR_NETWORK" ||
    ax?.message === "Network Error" ||
    /Failed to fetch|NetworkError|Cannot reach/i.test(ax?.message ?? "")
  ) {
    return "Cannot reach API — start the server (npm run dev:server on :4000)";
  }
  if (ax?.response?.status === 401) return "Invalid email or password";
  if (ax?.message) return ax.message;
  return fallback;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem("ngc_token"),
  loading: false,
  error: null,

  clearError: () => set({ error: null }),

  login: async (email, password, role) => {
    authEpoch += 1;
    set({ loading: true, error: null });
    const body = {
      email: email.trim().toLowerCase(),
      password: password?.trim() || "demo",
      role: role ?? ("vendor" as Role),
    };

    try {
      const data = await loginRequest(body);
      const user = data.user as User;

      // Always persist success — ignore stale /me races
      localStorage.setItem("ngc_token", data.token);
      set({
        user,
        token: data.token,
        loading: false,
        error: null,
      });
      return user;
    } catch (err: unknown) {
      const message = errorMessage(err, "Login failed");
      set({ loading: false, error: message });
      throw new Error(message);
    }
  },

  register: async (payload) => {
    authEpoch += 1;
    set({ loading: true, error: null });
    try {
      const { data } = await api.post<{ user: User; token: string }>(
        "/auth/register",
        payload
      );
      localStorage.setItem("ngc_token", data.token);
      set({ user: data.user, token: data.token, loading: false });
      return data.user;
    } catch (err: unknown) {
      const message = errorMessage(err, "Registration failed");
      set({ loading: false, error: message });
      throw new Error(message);
    }
  },

  logout: () => {
    authEpoch += 1;
    localStorage.removeItem("ngc_token");
    set({ user: null, token: null, error: null });
  },

  fetchMe: async () => {
    const token = localStorage.getItem("ngc_token");
    if (!token) {
      set({ user: null, token: null });
      return;
    }
    const epoch = authEpoch;
    set({ loading: true });
    try {
      const { data } = await api.get<{ user: User }>("/auth/me");
      if (epoch !== authEpoch) return;
      if (localStorage.getItem("ngc_token") !== token) return;
      set({ user: data.user, token, loading: false });
    } catch {
      if (epoch !== authEpoch) return;
      if (localStorage.getItem("ngc_token") === token) {
        localStorage.removeItem("ngc_token");
        set({ user: null, token: null, loading: false });
      } else {
        set({ loading: false });
      }
    }
  },
}));
