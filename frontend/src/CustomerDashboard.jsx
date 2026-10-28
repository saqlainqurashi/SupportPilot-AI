
import { useCallback, useEffect, useState } from "react";
import {
  createTicket,
  getTickets,
  getTicketMessages,
  addTicketMessage,
} from "./api";
import "./CustomerDashboard.css";

export default function CustomerDashboard({ user, onLogout }) {
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [messageDraft, setMessageDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadTickets = useCallback(async () => {
    try {
      setError("");
      const data = await getTickets();
      setTickets(data);
    } catch (err) {
      setError(err.message || "Could not load your tickets.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  async function handleCreateTicket(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const ticket = await createTicket({
        customer_name: user.full_name,
        customer_email: user.email,
        subject: subject.trim(),
        description: description.trim(),
        priority,
      });

      setSubject("");
      setDescription("");
      setPriority("medium");
      setSuccess("Your support ticket has been submitted.");
      await loadTickets();
      await openTicket(ticket);
    } catch (err) {
      setError(err.message || "Could not create your ticket.");
    } finally {
      setSaving(false);
    }
  }

  async function openTicket(ticket) {
    setSelectedTicket(ticket);
    setMessages([]);
    setMessageDraft("");
    setError("");

    try {
      const data = await getTicketMessages(ticket.id);
      setMessages(data);
    } catch (err) {
      setError(err.message || "Could not load the conversation.");
    }
  }

  async function sendMessage(event) {
    event.preventDefault();

    const body = messageDraft.trim();
    if (!body || !selectedTicket) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await addTicketMessage(selectedTicket.id, body);
      const updatedMessages = await getTicketMessages(selectedTicket.id);
      setMessages(updatedMessages);
      setMessageDraft("");
      setSuccess("Your message has been sent.");
    } catch (err) {
      setError(err.message || "Could not send your message.");
    } finally {
      setSaving(false);
    }
  }

  function formatStatus(status) {
    return status.replaceAll("_", " ");
  }

  return (
    <div className="customer-page">
      <header className="customer-header">
        <div className="customer-brand">
          <div className="customer-logo">S</div>
          <div>
            <strong>SupportPilot <span>AI</span></strong>
            <small>Customer Portal</small>
          </div>
        </div>

        <div className="customer-account">
          <span>{user.full_name}</span>
          <button className="customer-button secondary" onClick={onLogout}>
            Sign out
          </button>
        </div>
      </header>

      <main className="customer-content">
        <section className="customer-intro">
          <p className="customer-eyebrow">CUSTOMER SUPPORT</p>
          <h1>How can we help you?</h1>
          <p>
            Submit a support request, track its progress, and communicate
            directly with our support team.
          </p>
        </section>

        {error && <div className="customer-alert error">{error}</div>}
        {success && <div className="customer-alert success">{success}</div>}

        <div className="customer-grid">
          <section className="customer-panel">
            <h2>Submit a request</h2>
            <p className="customer-muted">
              Tell us what you need help with.
            </p>

            <form className="customer-form" onSubmit={handleCreateTicket}>
              <label>
                Subject
                <input
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  maxLength={200}
                  placeholder="What do you need help with?"
                  required
                />
              </label>

              <label>
                Description
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={5}
                  placeholder="Explain your issue in detail..."
                  required
                />
              </label>

              <label>
                Priority
                <select
                  value={priority}
                  onChange={(event) => setPriority(event.target.value)}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </label>

              <button
                className="customer-button primary"
                disabled={saving}
              >
                {saving ? "Please wait..." : "Submit ticket"}
              </button>
            </form>
          </section>

          <section className="customer-panel">
            <div className="customer-section-heading">
              <div>
                <h2>My tickets</h2>
                <p className="customer-muted">
                  {tickets.length} ticket{tickets.length === 1 ? "" : "s"} submitted
                </p>
              </div>
              <button
                className="customer-button secondary"
                onClick={loadTickets}
                disabled={loading}
              >
                Refresh
              </button>
            </div>

            {loading ? (
              <p className="customer-muted">Loading your tickets...</p>
            ) : tickets.length === 0 ? (
              <div className="customer-empty">
                <h3>No tickets yet</h3>
                <p>Your submitted requests will appear here.</p>
              </div>
            ) : (
              <div className="customer-ticket-list">
                {tickets.map((ticket) => (
                  <button
                    key={ticket.id}
                    className={`customer-ticket ${
                      selectedTicket?.id === ticket.id ? "selected" : ""
                    }`}
                    onClick={() => openTicket(ticket)}
                  >
                    <span className="customer-ticket-top">
                      <strong>{ticket.subject}</strong>
                      <span className={`customer-status status-${ticket.status}`}>
                        {formatStatus(ticket.status)}
                      </span>
                    </span>
                    <span className="customer-ticket-meta">
                      Ticket #{ticket.id} · {ticket.priority} priority
                    </span>
                    <span className="customer-ticket-meta">
                      Created {new Date(ticket.created_at).toLocaleDateString()}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {selectedTicket && (
              <div className="customer-conversation">
                <div className="customer-conversation-heading">
                  <div>
                    <p className="customer-eyebrow">
                      TICKET #{selectedTicket.id}
                    </p>
                    <h3>{selectedTicket.subject}</h3>
                  </div>
                  <button
                    className="customer-close"
                    onClick={() => {
                      setSelectedTicket(null);
                      setMessages([]);
                      setError("");
                      setSuccess("");
                    }}
                    aria-label="Close conversation"
                  >
                    ×
                  </button>
                </div>

                <div className="customer-messages">
                  {messages.length === 0 ? (
                    <p className="customer-muted">
                      No messages yet. Send a message to start the conversation.
                    </p>
                  ) : (
                    messages.map((message) => (
                      <article
                        key={message.id}
                        className={`customer-message ${
                          message.author_type === "support"
                            ? "from-support"
                            : "from-customer"
                        }`}
                      >
                        <div>
                          <strong>
                            {message.author_type === "support"
                              ? "Support Team"
                              : "You"}
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

                {selectedTicket.status !== "resolved" ? (
                  <form
                    className="customer-reply-form"
                    onSubmit={sendMessage}
                  >
                    <label htmlFor="customer-message">Your message</label>
                    <textarea
                      id="customer-message"
                      value={messageDraft}
                      onChange={(event) => setMessageDraft(event.target.value)}
                      placeholder="Write a message to the support team..."
                      rows={3}
                      maxLength={10000}
                      required
                    />
                    <button
                      className="customer-button primary"
                      disabled={saving || !messageDraft.trim()}
                    >
                      {saving ? "Sending..." : "Send message"}
                    </button>
                  </form>
                ) : (
                  <p className="customer-muted">
                    This ticket is resolved. Contact support if you need
                    further assistance.
                  </p>
                )}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
