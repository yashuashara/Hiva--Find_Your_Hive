import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { listUsers, setUserRole, setUserStatus, errorMessage } from "../services/api";
import { useAuth } from "../context/AuthContext";
import useDebounce from "../hooks/useDebounce";
import PageHeader from "../components/PageHeader";
import Loader from "../components/Loader";
import EmptyState from "../components/EmptyState";
import Pagination from "../components/Pagination";
import StatusBadge from "../components/StatusBadge";
import { formatDate } from "../utils/format";
import { HiSearch } from "react-icons/hi";

const ROLE_LABELS = { student: "Student", uni_admin: "University admin", super_admin: "Super admin" };

// Search accounts; super admins grant/revoke admin roles; admins suspend accounts.
const AdminUsers = () => {
  const { user: me, isSuperAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [page, setPage] = useState(1);
  const q = useDebounce(search.trim());

  useEffect(() => setPage(1), [q, role]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const params = { page };
      if (q) params.q = q;
      if (role) params.role = role;
      const res = await listUsers(params);
      setUsers(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      setLoadError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [q, role, page]);

  useEffect(() => {
    load();
  }, [load]);

  const changeRole = async (u, newRole) => {
    if (!window.confirm(`Change ${u.name}'s role to ${ROLE_LABELS[newRole]}?`)) return;
    try {
      const res = await setUserRole(u.id, newRole);
      setUsers((prev) => prev.map((x) => (x.id === u.id ? res.data.data : x)));
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
      setUsers((prev) => prev.map((x) => (x.id === u.id ? res.data.data : x)));
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
          <select aria-label="Role" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="">All roles</option>
            {Object.entries(ROLE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <Loader />
      ) : loadError ? (
        <EmptyState error title="Couldn't load users" message={loadError} onRetry={load} />
      ) : users.length === 0 ? (
        <EmptyState title="No users found" />
      ) : (
        <>
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
                {users.map((u) => {
                  const isMe = u.id === me.id;
                  return (
                    <tr key={u.id}>
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
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination pagination={pagination} onPage={setPage} />
        </>
      )}
    </div>
  );
};

export default AdminUsers;
