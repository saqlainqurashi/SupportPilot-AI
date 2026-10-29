
import { useCallback, useEffect, useState } from "react";
import { createAgent, getAgents, updateAgentStatus } from "./api";
import "./AgentManagement.css";

export default function AgentManagement() {
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
  });

  const [agents, setAgents] = useState([]);
  const [loadingAgents, setLoadingAgents] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [updatingAgentId, setUpdatingAgentId] = useState(null);

  const loadAgents = useCallback(async () => {
    setLoadingAgents(true);

    try {
      const data = await getAgents();
      setAgents(data);
    } catch (err) {
      setError(err.message || "Could not load agents.");
    } finally {
      setLoadingAgents(false);
    }
  }, []);

  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const agent = await createAgent({
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        password: form.password,
      });

      setSuccess(
        `Agent account created successfully for ${
          agent.full_name || form.full_name
        }.`
      );

      setForm({ full_name: "", email: "", password: "" });

      // Refresh the table after creating an agent.
      await loadAgents();
    } catch (err) {
      setError(err.message || "Could not create agent account.");
    } finally {
      setSaving(false);
    }
  }

  function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);

    return Number.isNaN(date.getTime())
      ? "—"
      : date.toLocaleDateString();
  }
  async function handleAgentStatusChange(agent) {
  const nextStatus = !agent.is_active;

  setError("");
  setSuccess("");
  setUpdatingAgentId(agent.id);

  try {
    await updateAgentStatus(agent.id, nextStatus);

    setAgents((currentAgents) =>
      currentAgents.map((item) =>
        item.id === agent.id
          ? { ...item, is_active: nextStatus }
          : item
      )
    );

    setSuccess(
      `${agent.full_name} has been ${
        nextStatus ? "activated" : "deactivated"
      }.`
    );
  } catch (err) {
    console.error("Agent status update failed:", err);
    setError(err.message || "Could not update agent status.");
  } finally {
    setUpdatingAgentId(null);
  }
}

  return (
    <section className="agent-management">
      <div className="agent-management-heading">
        <div>
          <p className="agent-management-eyebrow">ADMINISTRATION</p>
          <h2>Agent Management</h2>
          <p>Create accounts and manage your support team.</p>
        </div>

        <button
          type="button"
          className="agent-management-refresh"
          onClick={loadAgents}
          disabled={loadingAgents}
        >
          {loadingAgents ? "Loading..." : "Refresh agents"}
        </button>
      </div>

      {error && (
        <div className="agent-management-alert error" role="alert">
          {error}
        </div>
      )}

      {success && (
        <div className="agent-management-alert success" role="status">
          {success}
        </div>
      )}

      <div className="agent-management-card">
        <h3>Create a new agent</h3>
        <p className="agent-management-muted">
          New accounts receive the agent role, not administrator access.
        </p>

        <form className="agent-management-form" onSubmit={handleSubmit}>
          <label>
            Full name
            <input
              name="full_name"
              value={form.full_name}
              onChange={updateField}
              placeholder="Enter agent's full name"
              maxLength={100}
              autoComplete="name"
              required
            />
          </label>

          <label>
            Email address
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={updateField}
              placeholder="agent@example.com"
              maxLength={255}
              autoComplete="email"
              required
            />
          </label>

          <label>
            Temporary password
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={updateField}
              placeholder="Set an initial password"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </label>

          <button
            className="agent-management-submit"
            type="submit"
            disabled={saving}
          >
            {saving ? "Creating account..." : "Create agent account"}
          </button>
        </form>
      </div>

      <div className="agent-management-card agent-list-card">
        <div className="agent-list-heading">
          <div>
            <h3>Support team</h3>
            <p className="agent-management-muted">
              {agents.length} {agents.length === 1 ? "agent" : "agents"} found
            </p>
          </div>
        </div>

        {loadingAgents ? (
          <p className="agent-management-muted">Loading agents...</p>
        ) : agents.length === 0 ? (
          <p className="agent-management-muted">
            No agents have been created yet.
          </p>
        ) : (
          <div className="agent-table-wrapper">
            <table className="agent-table">
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {agents.map((agent) => (
                  <tr key={agent.id}>
                    <td>
                      <div className="agent-name-cell">
                        <span className="agent-avatar">
                          {(agent.full_name || "?")
                            .trim()
                            .charAt(0)
                            .toUpperCase()}
                        </span>
                        <span>{agent.full_name}</span>
                      </div>
                    </td>

                    <td>{agent.email}</td>

                    <td>
                      <span
                        className={`agent-status ${
                          agent.is_active ? "active" : "inactive"
                        }`}
                      >
                        {agent.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>

                    <td>{formatDate(agent.created_at)}</td>
                    <td>
                      <button
                        type="button"
                        className={`agent-status-action ${
                          agent.is_active ? "deactivate" : "activate"
                        }`}
                        disabled={updatingAgentId === agent.id}
                        onClick={() => handleAgentStatusChange(agent)}
                      >
                        {updatingAgentId === agent.id
                          ? "Updating..."
                          : agent.is_active
                            ? "Deactivate"
                            : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
