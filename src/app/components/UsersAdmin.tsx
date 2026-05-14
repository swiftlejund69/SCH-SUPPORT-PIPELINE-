"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { ROLES, getAuthHeaders, type Role } from "../../lib/auth";

type AdminUser = {
  id: string;
  fullName: string;
  username: string;
  role: Role;
  createdAt?: string;
  revoked?: boolean;
};

type UsersAdminProps = {
  currentUserId: string;
};

const DEFAULT_ROLE: Role = "Receptionist";

export function UsersAdmin({ currentUserId }: UsersAdminProps) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [role, setRole] = useState<Role>(DEFAULT_ROLE);
  const [password, setPassword] = useState("");
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFullName, setEditFullName] = useState("");
  const [editRole, setEditRole] = useState<Role>(DEFAULT_ROLE);
  const [editPassword, setEditPassword] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    const headers = await getAuthHeaders();
    const response = await fetch("/api/admin/users", { headers });
    setLoading(false);

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      toast.error("Could not load users", {
        description: body.error ?? response.statusText,
      });
      return;
    }

    const data = (await response.json()) as { users: AdminUser[] };
    setUsers(data.users);
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!fullName.trim() || !username.trim() || !password) {
      toast.error("Name, username and password are required.");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }

    setCreating(true);
    const headers = await getAuthHeaders();
    const response = await fetch("/api/admin/users", {
      method: "POST",
      headers,
      body: JSON.stringify({
        fullName: fullName.trim(),
        username: username.trim(),
        role,
        password,
      }),
    });
    setCreating(false);

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      toast.error("Could not create user", {
        description: body.error ?? response.statusText,
      });
      return;
    }

    toast.success("User created", {
      description: `${fullName.trim()} (${role})`,
    });
    setFullName("");
    setUsername("");
    setRole(DEFAULT_ROLE);
    setPassword("");
    void loadUsers();
  }

  function startEdit(user: AdminUser) {
    setEditingId(user.id);
    setEditFullName(user.fullName);
    setEditRole(user.role);
    setEditPassword("");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditFullName("");
    setEditRole(DEFAULT_ROLE);
    setEditPassword("");
  }

  async function handleEditSave() {
    if (!editingId) {
      return;
    }
    if (editPassword && editPassword.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }

    setEditSaving(true);
    const headers = await getAuthHeaders();
    const response = await fetch(`/api/admin/users/${editingId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        fullName: editFullName.trim() || undefined,
        role: editRole,
        password: editPassword || undefined,
      }),
    });
    setEditSaving(false);

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      toast.error("Could not update user", {
        description: body.error ?? response.statusText,
      });
      return;
    }

    toast.success("User updated");
    cancelEdit();
    void loadUsers();
  }

  async function handleToggleAccess(user: AdminUser) {
    if (user.id === currentUserId && !user.revoked) {
      toast.error("You cannot revoke your own access.");
      return;
    }

    const action: "revoke" | "restore" = user.revoked ? "restore" : "revoke";
    if (
      action === "revoke" &&
      !window.confirm(
        `Revoke access for ${user.fullName}? They will be signed out and unable to log in until you restore access.`,
      )
    ) {
      return;
    }

    const headers = await getAuthHeaders();
    const response = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ access: action }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      toast.error(
        action === "revoke"
          ? "Could not revoke access"
          : "Could not restore access",
        { description: body.error ?? response.statusText },
      );
      return;
    }

    toast.success(
      action === "revoke" ? "Access revoked" : "Access restored",
      { description: user.fullName },
    );
    void loadUsers();
  }

  async function handleDelete(user: AdminUser) {
    if (user.id === currentUserId) {
      toast.error("You cannot delete your own account.");
      return;
    }
    if (
      !window.confirm(
        `Delete ${user.fullName}? They will lose access immediately. This cannot be undone.`,
      )
    ) {
      return;
    }

    const headers = await getAuthHeaders();
    const response = await fetch(`/api/admin/users/${user.id}`, {
      method: "DELETE",
      headers,
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      toast.error("Could not delete user", {
        description: body.error ?? response.statusText,
      });
      return;
    }

    toast.success("User deleted", { description: user.fullName });
    void loadUsers();
  }

  return (
    <section className="users-admin">
      <header className="records-heading">
        <h2>Users</h2>
        <p>
          Create accounts for staff, set their role, and reset passwords when
          needed.
        </p>
      </header>

      <form className="users-create" onSubmit={handleCreate}>
        <h3>Add new user</h3>
        <div className="form-grid">
          <label className="field">
            <span>Full name</span>
            <input
              onChange={(event) => setFullName(event.target.value)}
              placeholder="e.g. Jane Doe"
              required
              type="text"
              value={fullName}
            />
          </label>
          <label className="field">
            <span>Username (used to sign in)</span>
            <input
              onChange={(event) => setUsername(event.target.value)}
              placeholder="e.g. jane"
              required
              type="text"
              value={username}
            />
          </label>
          <label className="field">
            <span>Role</span>
            <select
              onChange={(event) => setRole(event.target.value as Role)}
              value={role}
            >
              {ROLES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Password (min 8 characters)</span>
            <input
              autoComplete="new-password"
              minLength={8}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Initial password"
              required
              type="text"
              value={password}
            />
          </label>
        </div>
        <button className="submit-button" disabled={creating} type="submit">
          {creating ? "Creating…" : "Create user"}
        </button>
      </form>

      <section className="users-list">
        <h3>All users</h3>
        {loading ? (
          <p className="empty-records">Loading users…</p>
        ) : users.length === 0 ? (
          <p className="empty-records">No users yet.</p>
        ) : (
          <ul className="users-table" role="list">
            {users.map((user) => (
              <li
                className={`users-row${user.revoked ? " revoked" : ""}`}
                key={user.id}
              >
                {editingId === user.id ? (
                  <div className="users-edit">
                    <label className="field">
                      <span>Full name</span>
                      <input
                        onChange={(event) =>
                          setEditFullName(event.target.value)
                        }
                        type="text"
                        value={editFullName}
                      />
                    </label>
                    <label className="field">
                      <span>Role</span>
                      <select
                        onChange={(event) =>
                          setEditRole(event.target.value as Role)
                        }
                        value={editRole}
                      >
                        {ROLES.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span>New password (optional)</span>
                      <input
                        autoComplete="new-password"
                        onChange={(event) =>
                          setEditPassword(event.target.value)
                        }
                        placeholder="Leave blank to keep current"
                        type="text"
                        value={editPassword}
                      />
                    </label>
                    <div className="users-row-actions">
                      <button
                        className="submit-button compact-button"
                        disabled={editSaving}
                        onClick={() => void handleEditSave()}
                        type="button"
                      >
                        {editSaving ? "Saving…" : "Save"}
                      </button>
                      <button
                        className="secondary-button"
                        disabled={editSaving}
                        onClick={cancelEdit}
                        type="button"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="users-row-main">
                      <strong>{user.fullName}</strong>
                      <small>
                        {user.username} · {user.role}
                        {user.id === currentUserId ? " · you" : ""}
                        {user.revoked ? (
                          <span className="user-status-tag">
                            access revoked
                          </span>
                        ) : null}
                      </small>
                    </div>
                    <div className="users-row-actions">
                      <button
                        className="secondary-button"
                        onClick={() => startEdit(user)}
                        type="button"
                      >
                        Edit
                      </button>
                      <button
                        className="secondary-button"
                        disabled={user.id === currentUserId && !user.revoked}
                        onClick={() => void handleToggleAccess(user)}
                        type="button"
                      >
                        {user.revoked ? "Restore access" : "Revoke access"}
                      </button>
                      <button
                        className="secondary-button danger-button"
                        disabled={user.id === currentUserId}
                        onClick={() => void handleDelete(user)}
                        type="button"
                      >
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
