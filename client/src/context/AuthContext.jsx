import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import * as api from "../services/api";

const AuthContext = createContext(null);

export const ADMIN_ROLES = ["uni_admin", "super_admin"];

// Holds the signed-in user. The server is the source of truth: on load we ask
// /auth/me, and the session itself lives in an httpOnly cookie that
// JavaScript cannot read (so it cannot be stolen by injected scripts).
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await api.getMe();
      setUser(res.data.data);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (credentials) => {
    const res = await api.login(credentials);
    setUser(res.data.data);
    return res.data.data;
  }, []);

  const signup = useCallback(async (details) => {
    const res = await api.signup(details);
    setUser(res.data.data);
    return res.data.data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAdmin: !!user && ADMIN_ROLES.includes(user.role),
      login,
      signup,
      logout,
      refresh,
    }),
    [user, loading, login, signup, logout, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
