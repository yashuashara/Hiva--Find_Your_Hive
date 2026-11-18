import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { listUsers, setUserRole, setUserStatus, errorMessage } from "../services/api";
import { useAuth } from "../context/AuthContext";
import useDebounce from "../hooks/useDebounce";
import useAsyncData from "../hooks/useAsyncData";
import useUrlFilters from "../hooks/useUrlFilters";
import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";
import Pagination from "../components/Pagination";
import StatusBadge from "../components/StatusBadge";
import { SkeletonTable } from "../components/Skeleton";
import { AnimatePresence, m, rowMotion } from "../lib/motion";
import { formatDate } from "../utils/format";
import { HiSearch } from "react-icons/hi";

const ROLE_LABELS = { student: "Student", uni_admin: "University admin", super_admin: "Super admin" };
const DEFAULTS = { q: "", role: "", page: "1" };

// Search accounts; super admins grant/revoke admin roles; admins suspend accounts.
const AdminUsers = () => {
  const { user: me, isSuperAdmin } = useAuth();
  const [filters, setFilters] = useUrlFilters(DEFAULTS);
  const { role } = filters;
  const page = Number(filters.page) || 1;

  const [search, setSearch] = useState(filters.q);
  const q = useDebounce(search.trim());
  useEffect(() => {
    if (q !== filters.q) setFilters({ q });
  }, [q, filters.q, setFilters]);

  const params = { page };
  if (filters.q) params.q = filters.q;
  if (role) params.role = role;

  const { data, error, initialLoading, refreshing, reload: load, setData } = useAsyncData(
    () => listUsers(params).then((res) => res.data),
    JSON.stringify(params)
  );
  const users = data?.data || [];
  const replaceUser = (updated) =>
    setData((d) => ({ ...d, data: d.data.map((x) => (x.id === updated.id ? updated : x)) }));

  const changeRole = async (u, newRole) => {
    if (!window.confirm(`Change ${u.name}'s role to ${ROLE_LABELS[newRole]}?`)) return;
    try {
      const res = await setUserRole(u.id, newRole);
      replaceUser(res.data.data);
      toast.success("Role updated");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const toggleStatus = async (u) => {
    const next = u.status === "active" ? "suspended" : "active";
    if (!window.confirm(next === "suspended" ? `Suspend ${u.name}? They will be signed out.` : `Reactivate ${u.name}?`)) return;
    try {
      const res = await setUserStatus(u.id, next);
      replaceUser(res.data.data);
      toast.success(next === "suspended" ? "Account suspended" : "Account reactivated");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <div className="page-container">
      <PageHeader title="Users" subtitle={isSuperAdmin ? "Search accounts, assign admin roles and moderate" : "Search and moderate student accounts"} />

      <div className="toolbar">
        <div className="search-box">
          <HiSearch className="search-icon" aria-hidden="true" />
          <input type="search" aria-label="Search by name or email" placeholder="Search by name or email..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="filters-group">
          <select aria-label="Role" value={role} onChange={(e) => setFilters({ role: e.target.value })}>
            <option value="">All roles</option>
            {Object.entries(ROLE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
      </div>

      <div className={`results-region ${refreshing ? "is-refreshing" : ""}`} aria-busy={refreshing || initialLoading}>
        {initialLoading ? (
          <SkeletonTable />
        ) : error && !data ? (
          <EmptyState error title="Couldn't load users" message={error} onRetry={load} />
        ) : (
          <>
            {error && <div className="notice notice--danger inline-error" role="alert">{error}</div>}
            {users.length === 0 ? (
              <EmptyState title="No users found" />
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th scope="col">Name</th>
                      <th scope="col">Email</th>
                      <th scope="col">Role</th>
                      <th scope="col">Status</th>
                      <th scope="col">Joined</th>
                      <th scope="col"><span className="sr-only">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence initial={false}>
                      {users.map((u) => {
                        const isMe = u.id === me.id;
                        return (
                          <m.tr key={u.id} {...rowMotion}>
                            <td className="cell-bold">{u.name}{isMe && " (you)"}</td>
                            <td>{u.email}</td>
                            <td>
                              {isSuperAdmin && !isMe ? (
                                <select aria-label={`Role for ${u.name}`} value={u.role} onChange={(e) => changeRole(u, e.target.value)}>
                                  {Object.entries(ROLE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                                </select>
                              ) : (
                                ROLE_LABELS[u.role]
                              )}
                            </td>
                            <td><StatusBadge status={u.status} /></td>
                            <td>{formatDate(u.createdAt)}</td>
                            <td>
                              {!isMe && (isSuperAdmin || u.role === "student") && (
                                <button type="button" className={`btn btn-sm ${u.status === "active" ? "btn-danger-outline" : "btn-secondary"}`} onClick={() => toggleStatus(u)}>
                                  {u.status === "active" ? "Suspend" : "Reactivate"}
                                </button>
                              )}
                            </td>
                          </m.tr>
                        );
                      })}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            )}
            <Pagination pagination={data?.pagination} onPage={(p) => setFilters({ page: p })} />
          </>
        )}
      </div>
    </div>
  );
};

export default AdminUsers;
