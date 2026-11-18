import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import * as api from "../services/api";

const AuthContext = createContext(null);

export const ADMIN_ROLES = ["uni_admin", "super_admin"];

// All tabs of a browser share ONE login cookie. When someone signs in, signs
// up or signs out in one tab, the others are told through this channel so
// they never keep showing a stale account.
const CHANNEL = "ee-auth";
const openChannel = () => (typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(CHANNEL) : null);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// Holds the signed-in user and their club memberships. The server is the
// source of truth: on load we ask /auth/me, and the session itself lives in an
// httpOnly cookie that JavaScript cannot read.
export function AuthProvider({ children }) {
  const [user, setUserState] = useState(null);
  const [memberships, setMembershipsState] = useState([]);
  const [loading, setLoading] = useState(true);
  const userRef = useRef(null);
  const channelRef = useRef(null);

  // Only replace state when something actually changed, so re-checking the
  // session (e.g. when a tab regains focus) doesn't make pages reload.
  const setUser = useCallback((next) => {
    if (same(userRef.current, next)) return;
    userRef.current = next;
    setUserState(next);
  }, []);
  const setMemberships = useCallback((next) => setMembershipsState((prev) => (same(prev, next) ? prev : next)), []);

  const loadMemberships = useCallback(async () => {
    try {
      const res = await api.myClubs();
      setMemberships(res.data.data);
    } catch {
      setMemberships([]);
    }
  }, [setMemberships]);

  // Asks the server who this browser is signed in as. If that changed since
  // this tab last checked (another tab signed in/out), say so.
  const refresh = useCallback(async ({ announce = false } = {}) => {
    const before = userRef.current;
    let after = null;
    try {
      const res = await api.getMe();
      after = res.data.data;
      setUser(after);
      await loadMemberships();
    } catch {
      setUser(null);
      setMemberships([]);
    } finally {
      setLoading(false);
    }
    if (announce && before?.id !== after?.id) {
      toast(after ? `You're now signed in as ${after.name} (changed in another tab).` : "You were signed out in another tab.", {
        id: "auth-changed",
        icon: "🔄",
      });
    }
  }, [loadMemberships, setUser, setMemberships]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Stay in sync with other tabs: instantly via BroadcastChannel, and as a
  // fallback whenever this tab becomes visible again.
  useEffect(() => {
    const channel = openChannel();
    channelRef.current = channel;
    if (channel) channel.onmessage = () => refresh({ announce: true });
    const onVisible = () => document.visibilityState === "visible" && refresh({ announce: true });
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      channel?.close();
      channelRef.current = null;
    };
  }, [refresh]);

  const notifyOtherTabs = () => channelRef.current?.postMessage({ type: "auth-changed" });

  const login = useCallback(async (credentials) => {
    const res = await api.login(credentials);
    setUser(res.data.data);
    await loadMemberships();
    notifyOtherTabs();
    return res.data.data;
  }, [loadMemberships, setUser]);

  const signup = useCallback(async (details) => {
    const res = await api.signup(details);
    setUser(res.data.data);
    setMemberships([]);
    notifyOtherTabs();
    return res.data.data;
  }, [setUser, setMemberships]);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      setUser(null);
      setMemberships([]);
      notifyOtherTabs();
    }
  }, [setUser, setMemberships]);

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
