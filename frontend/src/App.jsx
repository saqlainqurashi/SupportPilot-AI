import { useCallback, useEffect, useState } from "react";
import {
  createTicket,
  getTickets,
  getTicketMessages,
  updateTicketStatus,
  addTicketMessage,
  getCurrentUser,
  logoutUser,
  API_URL,
} from "./api";
import Auth from "./Auth";
import "./App.css";
import CustomerDashboard from "./CustomerDashboard";
import AgentDashboard from "./AgentDashboard";
import AgentManagement from "./AgentManagement";

const emptyForm = {
  customer_name: "",
  customer_email: "",
  subject: "",
  description: "",
  priority: "medium",
};

function App() {
  const [tickets, setTickets] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageDraft, setMessageDraft] = useState("");
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [activeSection, setActiveSection] = useState("tickets");
  
  useEffect(() => {
    let cancelled = false;

    async function checkAuth() {
      const token = localStorage.getItem("access_token");

      if (!token) {
        if (!cancelled) setAuthChecking(false);
        return;
      }

      try {
        const currentUser = await getCurrentUser();
        if (!cancelled) setUser(currentUser);
      } catch {
        logoutUser();
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setAuthChecking(false);
      }
    }

    checkAuth();

    return () => {
      cancelled = true;
    };
  }, []);

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
    if (
      !authChecking &&
      user &&
      (user.role === "admin" || user.role === "agent")
    ) {
      loadTickets();
    }
  }, [authChecking, user, loadTickets]);

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      await createTicket(form);
      setForm(emptyForm);
      setShowForm(false);
      await loadTickets();
    } catch (err) {
      setError(err.message || "Could not create ticket.");
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
    ].some((value) => value.toLowerCase().includes(query));

    const matchesStatus =
      statusFilter === "all" || ticket.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const openCount = tickets.filter(
    (ticket) => ticket.status === "open"
  ).length;

  const highPriorityCount = tickets.filter(
    (ticket) =>
      ticket.priority === "high" || ticket.priority === "urgent"
  ).length;


  
async function openTicket(ticket) {
  setSelectedTicket(ticket);
  setMessages([]);
  setMessageDraft("");
  setDetailLoading(true);
  setError("");

  try {
    const data = await getTicketMessages(ticket.id);
    setMessages(data);
  } catch (err) {
    setError(err.message || "Could not load conversation.");
  } finally {
    setDetailLoading(false);
  }
}

async function changeStatus(status) {
  if (!selectedTicket) return;

  setActionLoading(true);
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
    setActionLoading(false);
  }
}

async function sendMessage(event) {
  event.preventDefault();

  const body = messageDraft.trim();

  if (!body || !selectedTicket) return;

  setActionLoading(true);
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
    setActionLoading(false);
  }
}

    
  if (authChecking) {
    return <div className="empty-state">Checking your session...</div>;
  }

  if (!user) {
    return <Auth onLogin={setUser} />;
  }

  if (user.role === "customer") {
    return (
      <CustomerDashboard
        user={user}
        onLogout={() => {
          logoutUser();
          setUser(null);
          setTickets([]);
          setSelectedTicket(null);
        }}
      />
    );
  }

  if (user.role === "agent") {
    return (
      <AgentDashboard
        user={user}
        onLogout={() => {
          logoutUser();
          setUser(null);
          setTickets([]);
          setSelectedTicket(null);
          setMessages([]);
        }}
      />
    );
  }

  if (user.role !== "admin") {
    logoutUser();
    return <Auth onLogin={setUser} />;
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">S</div>
          <span>SupportPilot<span className="brand-ai"> AI</span></span>
        </div>


          <p className="nav-label">WORKSPACE</p>

          <button
            className={`nav-item ${activeSection === "tickets" ? "active" : ""}`}
            onClick={() => setActiveSection("tickets")}
          >
            ▦ <span>Tickets</span>
          </button>

          <button
            className={`nav-item ${activeSection === "agents" ? "active" : ""}`}
            onClick={() => setActiveSection("agents")}
          >
            ♙ <span>Agent Management</span>
          </button>

          <div className="nav-item">◷ <span>Activity</span></div>
          <div className="nav-item">⚙ <span>Settings</span></div>


        <div className="sidebar-footer">
          <div className="avatar">SP</div>
          <div>
            <strong>Support Team</strong>
            <small>Local development</small>
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <p className="breadcrumb">
              Workspace / {activeSection === "tickets" ? "Tickets" : "Agent Management"}
            </p>
            <h1>
              {activeSection === "tickets" ? "Support Tickets" : "Agent Management"}
            </h1>
          </div>

          <div className="topbar-actions">
            <button
              className="secondary-btn"
              onClick={() => {
                logoutUser();
                setUser(null);
                setTickets([]);
                setSelectedTicket(null);
              }}
            >
              Sign out
            </button>
            {activeSection === "tickets" && (
              <button
                className="primary-btn"
                onClick={() => setShowForm(true)}
              >
                + New Ticket
              </button>
            )}
          </div>
        </header>
        {activeSection === "tickets" && (<>
        <section className="welcome">
          <div>
            <p className="eyebrow">SUPPORT OVERVIEW</p>
            <h2>Every conversation, organized.</h2>
            <p>Manage customer issues and keep every request on track.</p>
          </div>
          <div className="welcome-mark">SP</div>
        </section>

        {error && (
          <div className="error-banner" role="alert">
            {error}
          </div>
        )}

        <section className="stats">
          <StatCard label="Total Tickets" value={tickets.length} icon="▤" />
          <StatCard label="Open Tickets" value={openCount} icon="◷" />
          <StatCard
            label="High / Urgent Priority"
            value={highPriorityCount}
            icon="⚑"
          />
        </section>

        <section className="ticket-section">
          <div className="section-heading">
            <div>
              <h2>All Tickets</h2>
              <p>Review and manage incoming support requests.</p>
            </div>
            <button className="secondary-btn" onClick={loadTickets}>
              ↻ Refresh
            </button>
          </div>

          <div className="toolbar">
            <input
              className="search-input"
              placeholder="Search subject or customer..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">All statuses</option>
              <option value="open">Open</option>
              <option value="in_progress">In progress</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>

          {loading ? (
            <p className="empty-state">Loading tickets...</p>
          ) : filteredTickets.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">▤</div>
              <h3>No tickets found</h3>
              <p>Create a ticket or adjust your search filters.</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Ticket</th>
                    <th>Customer</th>
                    <th>Status</th>
                    <th>Priority</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTickets.map((ticket) => (
                    <tr key={ticket.id}>
                      <td>
                        <button
                          className="ticket-link"
                          onClick={() => openTicket(ticket)}
                        >
                          {ticket.subject}
                        </button>
                        <small className="ticket-id">
                          TKT-{String(ticket.id).padStart(4, "0")}
                        </small>
                      </td>
                      <td>
                        <strong>{ticket.customer_name}</strong>
                        <small className="ticket-id">
                          {ticket.customer_email}
                        </small>
                      </td>
                      <td>
                        <span className={`pill status-${ticket.status}`}>
                          {ticket.status.replace("_", " ")}
                        </span>
                      </td>
                      <td>
                        <span className={`priority priority-${ticket.priority}`}>
                          {ticket.priority}
                        </span>
                      </td>
                      <td>
                        {new Date(ticket.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
          </>
        )}

        {activeSection === "agents" && <AgentManagement />}
      </main>

      {showForm && (
        <div className="modal-backdrop">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="form-title"
          >
            <div className="modal-heading">
              <div>
                <h2 id="form-title">Create a ticket</h2>
                <p>Add a new customer support request.</p>
              </div>
              <button
                className="close-btn"
                onClick={() => setShowForm(false)}
                aria-label="Close form"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <label>
                Customer name
                <input
                  name="customer_name"
                  value={form.customer_name}
                  onChange={updateField}
                  maxLength={100}
                  required
                />
              </label>

              <label>
                Customer email
                <input
                  name="customer_email"
                  type="email"
                  value={form.customer_email}
                  onChange={updateField}
                  maxLength={255}
                  required
                />
              </label>

              <label>
                Subject
                <input
                  name="subject"
                  value={form.subject}
                  onChange={updateField}
                  maxLength={200}
                  required
                />
              </label>

              <label>
                Description
                <textarea
                  name="description"
                  value={form.description}
                  onChange={updateField}
                  rows={4}
                  required
                />
              </label>

              <label>
                Priority
                <select
                  name="priority"
                  value={form.priority}
                  onChange={updateField}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </label>

              <div className="form-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setShowForm(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button className="primary-btn" disabled={saving}>
                  {saving ? "Creating..." : "Create Ticket"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
      
{selectedTicket && (
  <div
    className="modal-backdrop"
    onClick={() => setSelectedTicket(null)}
  >
    <section
      className="modal detail-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ticket-detail-title"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="modal-heading">
        <div>
          <p className="breadcrumb">
            TKT-{String(selectedTicket.id).padStart(4, "0")}
          </p>
          <h2 id="ticket-detail-title">
            {selectedTicket.subject}
          </h2>
          <p>
            {selectedTicket.customer_name} ·{" "}
            {selectedTicket.customer_email}
          </p>
        </div>

        <button
          className="close-btn"
          onClick={() => setSelectedTicket(null)}
          aria-label="Close ticket details"
        >
          ×
        </button>
      </div>

      <div className="detail-description">
        <strong>Issue description</strong>
        <p>{selectedTicket.description}</p>
        <span className={`pill status-${selectedTicket.status}`}>
          {selectedTicket.status.replace("_", " ")}
        </span>
        {" "}
        <span
          className={`priority priority-${selectedTicket.priority}`}
        >
          {selectedTicket.priority}
        </span>
      </div>

      <label className="status-control">
        Ticket status
        <select
          value={selectedTicket.status}
          disabled={actionLoading}
          onChange={(event) => changeStatus(event.target.value)}
        >
          <option value="open">Open</option>
          <option value="in_progress">In progress</option>
          <option value="resolved">Resolved</option>
        </select>
      </label>

      <div className="conversation">
        <h3>Conversation history</h3>

        {detailLoading ? (
          <p className="empty-state">Loading conversation...</p>
        ) : messages.length === 0 ? (
          <p className="conversation-empty">
            No messages yet. Start the conversation below.
          </p>
        ) : (
          messages.map((message) => (
            <article
              className={`message message-${message.author_type}`}
              key={message.id}
            >
              <div className="message-meta">
                <strong>
                  {message.author_type === "support"
                    ? "Support Team"
                    : "Customer"}
                </strong>
                <small>
                  {new Date(message.created_at).toLocaleString()}
                </small>
              </div>
              <p>{message.body}</p>
            </article>
          ))
        )}
      </div>

      <form className="reply-form" onSubmit={sendMessage}>
        <label htmlFor="message-draft">Add a support message</label>
        <textarea
          id="message-draft"
          value={messageDraft}
          onChange={(event) => setMessageDraft(event.target.value)}
          placeholder="Write a response..."
          maxLength={10000}
          rows={3}
          required
        />
        <button
          className="primary-btn"
          disabled={actionLoading || detailLoading || !messageDraft.trim()}
        >
          {actionLoading ? "Saving..." : "Send Message"}
        </button>
      </form>
    </section>
  </div>
)}

    </div>
  );
}

function StatCard({ label, value, icon }) {
  return (
    <article className="stat-card">
      <div className="stat-top">
        <span>{label}</span>
        <span className="stat-icon">{icon}</span>
      </div>
      <strong className="stat-value">{value}</strong>
    </article>
  );
}

export default App;
