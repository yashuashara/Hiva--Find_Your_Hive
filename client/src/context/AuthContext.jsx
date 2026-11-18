import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import * as api from "../services/api";

const AuthContext = createContext(null);

export const ADMIN_ROLES = ["uni_admin", "super_admin"];

// Holds the signed-in user and their club memberships. The server is the
// source of truth: on load we ask /auth/me, and the session itself lives in an
// httpOnly cookie that JavaScript cannot read.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [memberships, setMemberships] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadMemberships = useCallback(async () => {
    try {
      const res = await api.myClubs();
      setMemberships(res.data.data);
    } catch {
      setMemberships([]);
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await api.getMe();
      setUser(res.data.data);
      await loadMemberships();
    } catch {
      setUser(null);
      setMemberships([]);
    } finally {
      setLoading(false);
    }
  }, [loadMemberships]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (credentials) => {
    const res = await api.login(credentials);
    setUser(res.data.data);
    await loadMemberships();
    return res.data.data;
  }, [loadMemberships]);

  const signup = useCallback(async (details) => {
    const res = await api.signup(details);
    setUser(res.data.data);
    setMemberships([]);
    return res.data.data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      setUser(null);
      setMemberships([]);
    }
  }, []);

  const value = useMemo(() => {
    const isAdmin = !!user && ADMIN_ROLES.includes(user.role);
    // Clubs where the user currently holds an active role.
    const activeClubs = memberships.filter((m) => m.status === "active" && m.club?.status === "approved");
    const profile = user?.profile || {};
    return {
      user,
      setUser,
      loading,
      isAdmin,
      isSuperAdmin: user?.role === "super_admin",
      memberships,
      activeClubs,
      // Can see the "Manage events" area (admins and club team members).
      canManageEvents: isAdmin || activeClubs.length > 0,
      profileComplete: !!(profile.prn && profile.department && profile.year),
      login,
      signup,
      logout,
      refresh,
      refreshMemberships: loadMemberships,
    };
  }, [user, loading, memberships, login, signup, logout, refresh, loadMemberships]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
