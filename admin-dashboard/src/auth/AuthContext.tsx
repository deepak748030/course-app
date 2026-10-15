import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ApiError, api, clearToken, getToken, onUnauthorized, setToken } from '../api/client';
import { connectRealtime, disconnectRealtime } from '../api/realtime';
import type { AdminUser } from '../api/types';

interface AuthState {
  user: AdminUser | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [ready, setReady] = useState(false);

  // Restore the session on load: token in storage → verify against /auth/me.
  useEffect(() => {
    let cancelled = false;
    async function restore() {
      const token = getToken();
      if (!token || token === 'demo-token') {
        if (token === 'demo-token') clearToken();
        setReady(true);
        return;
      }
      try {
        const { user: me } = await api.me();
        if (!cancelled && me.role === 'admin') setUser(me);
        if (!cancelled && me.role !== 'admin') clearToken();
      } catch (error) {
        // Only a session the server rejects signs the admin out. A network error, a server that is
        // still waking up, or a request cut short by a reload keeps the token for the next load.
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) clearToken();
      } finally {
        if (!cancelled) setReady(true);
      }
    }
    restore();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (user) connectRealtime();
    else disconnectRealtime();
  }, [user]);

  // A 401 anywhere logs the session out (e.g. token expired mid-work).
  useEffect(() => {
    const off = onUnauthorized(() => {
      clearToken();
      setUser(null);
    });
    return () => {
      off();
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { token, user: loggedIn } = await api.login(email, password);
    if (loggedIn.role !== 'admin') {
      throw new Error('This account does not have admin access');
    }
    setToken(token);
    setUser(loggedIn);
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, ready, login, logout }), [user, ready, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
