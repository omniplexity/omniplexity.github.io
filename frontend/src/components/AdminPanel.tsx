import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../lib/apiClient";

const ADMIN_AUDIT_LIMIT = 8;

type InviteRecord = {
  invite_code: string;
  expires_at: string;
  created_at: string;
  used_by: number | null;
  revoked_at: string | null;
};

type AdminUser = {
  id: number;
  username: string;
  display_name: string | null;
  role: string;
  status: "active" | "disabled";
  last_login: string | null;
};

type AuditEntry = {
  id: number;
  action: string;
  target: string;
  actor_user_id: number | null;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
};

const formatDateTime = (value: string | null) => {
  if (!value) {
    return "—";
  }
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch (error) {
    return value;
  }
};

const formatInviteState = (invite: InviteRecord) => {
  if (invite.revoked_at) {
    return { label: "revoked", intent: "rose" };
  }
  if (invite.used_by) {
    return { label: "used", intent: "amber" };
  }
  return { label: "unused", intent: "emerald" };
};

const badgeClasses = {
  emerald: "bg-emerald-100 text-emerald-700",
  amber: "bg-amber-100 text-amber-700",
  rose: "bg-rose-100 text-rose-700",
};

const AdminPanel = () => {
  const [invites, setInvites] = useState<InviteRecord[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);
  const [busyUserId, setBusyUserId] = useState<number | null>(null);

  const clearErrors = () => {
    setAdminError(null);
  };

  const handleResponse = async (response: Response) => {
    const text = await response.text();
    let data: any = {};
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { message: text };
      }
    }
    if (!response.ok) {
      throw new Error(data.message || `HTTP ${response.status}`);
    }
    return data;
  };

  const loadInvites = async () => {
    const response = await apiFetch("/admin/invites");
    const data = await handleResponse(response);
    setInvites(data.invites || []);
  };

  const loadUsers = async () => {
    const response = await apiFetch("/admin/users");
    const data = await handleResponse(response);
    setUsers(data.users || []);
  };

  const loadAudit = async () => {
    const response = await apiFetch(`/admin/audit?limit=${ADMIN_AUDIT_LIMIT}`);
    const data = await handleResponse(response);
    setAudit(data.entries || []);
  };

  const refreshAll = async () => {
    clearErrors();
    setRefreshing(true);
    try {
      await loadInvites();
      await loadUsers();
      await loadAudit();
    } catch (error) {
      if (error instanceof Error) {
        setAdminError(error.message);
      } else {
        setAdminError("Unable to load admin data");
      }
    } finally {
      setRefreshing(false);
    }
  };

  const handleCreateInvite = async () => {
    setInviteMessage(null);
    clearErrors();
    setCreatingInvite(true);
    try {
      const response = await apiFetch("/admin/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expires_in_hours: 24 }),
      });
      const data = await handleResponse(response);
      setInvites((prev) => [data, ...prev]);
      setInviteMessage(`Invite created: ${data.invite_code}`);
    } catch (error) {
      if (error instanceof Error) {
        setAdminError(error.message);
      } else {
        setAdminError("Unable to create invite");
      }
    } finally {
      setCreatingInvite(false);
    }
  };

  const handleToggleUserStatus = async (user: AdminUser) => {
    const nextStatus = user.status === "active" ? "disabled" : "active";
    setBusyUserId(user.id);
    clearErrors();
    try {
      const response = await apiFetch(`/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await handleResponse(response);
      setUsers((prev) =>
        prev.map((item) => (item.id === user.id ? { ...item, status: data.status } : item))
      );
    } catch (error) {
      if (error instanceof Error) {
        setAdminError(error.message);
      } else {
        setAdminError("Unable to update user status");
      }
    } finally {
      setBusyUserId(null);
    }
  };

  useEffect(() => {
    refreshAll();
  }, []);

  const activeUsers = useMemo(() => users.filter((user) => user.status === "active"), [users]);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">Admin</p>
          <h2 className="text-xl font-semibold text-slate-900">Moderation & invites</h2>
          <p className="text-xs text-slate-500">Invite users, review scope, and inspect recent audits.</p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={refreshAll}
            disabled={refreshing}
            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>
      {adminError ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-700">
          {adminError}
        </div>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Invites</p>
              <p className="text-sm font-semibold text-slate-900">Codes & expirations</p>
            </div>
            <button
              type="button"
              onClick={handleCreateInvite}
              disabled={creatingInvite}
              className="rounded-full border border-slate-200 bg-slate-900 px-3 py-1 text-[11px] font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {creatingInvite ? "Creating…" : "Create"}
            </button>
          </div>
          {inviteMessage ? (
            <div className="text-xs text-emerald-700">{inviteMessage}</div>
          ) : (
            <div className="text-xs text-slate-500">New invites expire in 24h.</div>
          )}
          <div className="space-y-2">
            {invites.length === 0 ? (
              <div className="text-xs text-slate-500">No invites yet.</div>
            ) : (
              invites.map((invite) => {
                const badge = formatInviteState(invite);
                return (
                  <div key={invite.invite_code} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2 text-xs">
                    <div>
                      <div className="font-mono text-[12px] text-slate-900">{invite.invite_code}</div>
                      <div className="text-[11px] text-slate-500">Expires {formatDateTime(invite.expires_at)}</div>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${badgeClasses[badge.intent as keyof typeof badgeClasses]}`}>
                      {badge.label}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Users</p>
              <p className="text-sm font-semibold text-slate-900">Active users ({activeUsers.length})</p>
            </div>
            <span className="text-[11px] text-slate-500">Tap to toggle status</span>
          </div>
          <div className="divide-y divide-slate-100 text-sm">
            {users.length === 0 ? (
              <div className="px-2 py-4 text-xs text-slate-500">No users found.</div>
            ) : (
              users.map((adminUser) => (
                <div key={adminUser.id} className="flex flex-wrap items-start justify-between gap-3 px-2 py-3">
                  <div>
                    <div className="font-medium text-slate-900">{adminUser.username}</div>
                    <div className="text-[11px] text-slate-500">
                      {adminUser.display_name ?? adminUser.role} • Last login {formatDateTime(adminUser.last_login)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span
                      className={`rounded-full px-2 py-0.5 font-semibold uppercase tracking-wide ${
                        adminUser.status === "active"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-rose-100 text-rose-700"
                      }`}
                    >
                      {adminUser.status}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleToggleUserStatus(adminUser)}
                      disabled={busyUserId === adminUser.id}
                      className="rounded-full border border-slate-200 px-3 py-1 text-[11px] text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {busyUserId === adminUser.id
                        ? "Updating…"
                        : adminUser.status === "active"
                          ? "Disable"
                          : "Activate"}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Audit</p>
            <p className="text-sm font-semibold text-slate-900">Recent events</p>
          </div>
          <div className="space-y-2 text-xs text-slate-500">
            {audit.length === 0 ? (
              <div>No audit entries.</div>
            ) : (
              audit.map((entry) => (
                <div key={entry.id} className="rounded-xl border border-dashed border-slate-100 bg-slate-50/50 p-2">
                  <div className="text-[12px] font-semibold text-slate-900">{entry.action}</div>
                  <div className="text-[11px] text-slate-500">{entry.target}</div>
                  <div className="text-[10px] text-slate-400">
                    {formatDateTime(entry.created_at)} by {entry.actor_user_id ?? "system"}
                    {entry.ip ? ` • ${entry.ip}` : ""}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
