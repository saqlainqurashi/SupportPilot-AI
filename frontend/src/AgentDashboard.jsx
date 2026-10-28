
import { useCallback, useEffect, useState } from "react";
import {
  getTickets,
  getTicketMessages,
  addTicketMessage,
  updateTicketStatus,
  updateTicketPriority,
} from "./api";
import "./AgentDashboard.css";

export default function AgentDashboard({ user, onLogout }) {
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageDraft, setMessageDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const loadTickets = useCallback(async () => {
    try {
      setError("");
      const data = await getTickets();
      setTickets(data);
    } catch (err) {
      setError(err.message || "Could not load tickets.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  async function openTicket(ticket) {
    setSelectedTicket(ticket);
    setMessages([]);
    setMessageDraft("");
    setError("");

    try {
      const data = await getTicketMessages(ticket.id);
      setMessages(data);
    } catch (err) {
      setError(err.message || "Could not load conversation.");
    }
  }

  async function changeStatus(status) {
    if (!selectedTicket) return;

    setSaving(true);
    setError("");

    try {
      const updated = await updateTicketStatus(
        selectedTicket.id,
        status
      );
      setSelectedTicket(updated);
      await loadTickets();
    } catch (err) {
      setError(err.message || "Could not update status.");
    } finally {
      setSaving(false);
    }
  }

  async function changePriority(priority) {
    if (!selectedTicket) return;

    setSaving(true);
    setError("");

    try {
      const updated = await updateTicketPriority(
        selectedTicket.id,
        priority
      );
      setSelectedTicket(updated);
      await loadTickets();
    } catch (err) {
      setError(err.message || "Could not update priority.");
    } finally {
      setSaving(false);
    }
  }

  async function sendMessage(event) {
    event.preventDefault();

    const body = messageDraft.trim();
    if (!body || !selectedTicket) return;

    setSaving(true);
    setError("");

    try {
      await addTicketMessage(selectedTicket.id, body);
      const updatedMessages = await getTicketMessages(
        selectedTicket.id
      );
      setMessages(updatedMessages);
      setMessageDraft("");
    } catch (err) {
      setError(err.message || "Could not send message.");
    } finally {
      setSaving(false);
    }
  }

  const filteredTickets = tickets.filter((ticket) => {
    const query = search.toLowerCase();

    const matchesSearch = [
      ticket.subject,
      ticket.customer_name,
      ticket.customer_email,
    ].some((value) =>
      (value || "").toLowerCase().includes(query)
    );

    const matchesStatus =
      statusFilter === "all" ||
      ticket.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const openCount = tickets.filter(
    (ticket) => ticket.status === "open"
  ).length;

  const inProgressCount = tickets.filter(
    (ticket) => ticket.status === "in_progress"
  ).length;

  const resolvedCount = tickets.filter(
    (ticket) => ticket.status === "resolved"
  ).length;

  return (
    <div className="agent-page">
      <header className="agent-header">
        <div>
          <strong className="agent-brand">
            SupportPilot <span>AI</span>
          </strong>
          <p>Agent Workspace</p>
        </div>

        <div className="agent-account">
          <div>
            <strong>{user.full_name}</strong>
            <small>Support Agent</small>
          </div>
          <button
            className="agent-btn secondary"
            onClick={onLogout}
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="agent-content">
        <section className="agent-intro">
          <p className="agent-eyebrow">SUPPORT OPERATIONS</p>
          <h1>Agent Dashboard</h1>
          <p>
            Review customer requests, manage tickets, and
            respond to conversations.
          </p>
        </section>

        {error && (
          <div className="agent-alert" role="alert">
            {error}
          </div>
        )}

        <section className="agent-stats">
          <article className="agent-stat">
            <span>Total tickets</span>
            <strong>{tickets.length}</strong>
          </article>
          <article className="agent-stat">
            <span>Open</span>
            <strong>{openCount}</strong>
          </article>
          <article className="agent-stat">
            <span>In progress</span>
            <strong>{inProgressCount}</strong>
          </article>
          <article className="agent-stat">
            <span>Resolved</span>
            <strong>{resolvedCount}</strong>
          </article>
        </section>

        <section className="agent-panel">
          <div className="agent-section-heading">
            <div>
              <h2>Customer Tickets</h2>
              <p>Review and manage incoming requests.</p>
            </div>
            <button
              className="agent-btn secondary"
              onClick={loadTickets}
              disabled={loading}
            >
              Refresh
            </button>
          </div>

          <div className="agent-toolbar">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search tickets or customers..."
              aria-label="Search tickets"
            />

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value)
              }
              aria-label="Filter by status"
            >
              <option value="all">All statuses</option>
              <option value="open">Open</option>
              <option value="in_progress">In progress</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>

          {loading ? (
            <p>Loading tickets...</p>
          ) : filteredTickets.length === 0 ? (
            <div className="agent-empty">
              <h3>No tickets found</h3>
              <p>Try changing your search or status filter.</p>
            </div>
          ) : (
            <div className="agent-ticket-list">
              {filteredTickets.map((ticket) => (
                <button
                  key={ticket.id}
                  className={`agent-ticket ${
                    selectedTicket?.id === ticket.id
                      ? "selected"
                      : ""
                  }`}
                  onClick={() => openTicket(ticket)}
                >
                  <span className="agent-ticket-top">
                    <strong>{ticket.subject}</strong>
                    <span
                      className={`agent-status status-${ticket.status}`}
                    >
                      {ticket.status.replaceAll("_", " ")}
                    </span>
                  </span>

                  <span className="agent-ticket-meta">
                    {ticket.customer_name} ·{" "}
                    {ticket.customer_email}
                  </span>

                  <span className="agent-ticket-meta">
                    Ticket #{ticket.id} · {ticket.priority} priority
                  </span>

                  <span className="agent-ticket-meta">
                    Created{" "}
                    {new Date(
                      ticket.created_at
                    ).toLocaleDateString()}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>

        {selectedTicket && (
          <section className="agent-panel agent-detail">
            <div className="agent-section-heading">
              <div>
                <p className="agent-eyebrow">
                  TICKET #{selectedTicket.id}
                </p>
                <h2>{selectedTicket.subject}</h2>
                <p>
                  {selectedTicket.customer_name} ·{" "}
                  {selectedTicket.customer_email}
                </p>
              </div>

              <button
                className="agent-btn secondary"
                onClick={() => {
                  setSelectedTicket(null);
                  setMessages([]);
                  setError("");
                }}
              >
                Close
              </button>
            </div>

            <div className="agent-description">
              <strong>Issue description</strong>
              <p>{selectedTicket.description}</p>
            </div>

            <div className="agent-controls">
              <label>
                Ticket status
                <select
                  value={selectedTicket.status}
                  onChange={(event) =>
                    changeStatus(event.target.value)
                  }
                  disabled={saving}
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In progress</option>
                  <option value="resolved">Resolved</option>
                </select>
              </label>

              <label>
                Priority
                <select
                  value={selectedTicket.priority}
                  onChange={(event) =>
                    changePriority(event.target.value)
                  }
                  disabled={saving}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </label>
            </div>

            <div className="agent-conversation">
              <h3>Conversation</h3>

              {messages.length === 0 ? (
                <p className="agent-muted">
                  No messages yet.
                </p>
              ) : (
                messages.map((message) => (
                  <article
                    key={message.id}
                    className={`agent-message ${
                      message.author_type === "support"
                        ? "from-support"
                        : "from-customer"
                    }`}
                  >
                    <div className="agent-message-meta">
                      <strong>
                        {message.author_type === "support"
                          ? "Support Team"
                          : "Customer"}
                      </strong>
                      <small>
                        {new Date(
                          message.created_at
                        ).toLocaleString()}
                      </small>
                    </div>
                    <p>{message.body}</p>
                  </article>
                ))
              )}
            </div>

            {selectedTicket.status !== "resolved" ? (
              <form
                className="agent-reply-form"
                onSubmit={sendMessage}
              >
                <label htmlFor="agent-reply">
                  Reply to customer
                </label>
                <textarea
                  id="agent-reply"
                  value={messageDraft}
                  onChange={(event) =>
                    setMessageDraft(event.target.value)
                  }
                  placeholder="Write your response..."
                  rows={4}
                  maxLength={10000}
                  required
                />
                <button
                  className="agent-btn primary"
                  disabled={saving || !messageDraft.trim()}
                >
                  {saving ? "Please wait..." : "Send reply"}
                </button>
              </form>
            ) : (
              <p className="agent-muted">
                This ticket is resolved. Reopen it to continue
                the conversation.
              </p>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
