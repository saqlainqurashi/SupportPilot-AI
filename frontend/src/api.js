
const API_URL = (
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "http://localhost:8000" : "")
).replace(/\/$/, "");

function getAuthHeaders() {
  const token = localStorage.getItem("access_token");

  return token
    ? { Authorization: `Bearer ${token}` }
    : {};
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...options.headers,
    },
  });

  if (!response.ok) {
    let message = "Something went wrong";

    try {
      const error = await response.json();
      message =
        typeof error.detail === "string"
          ? error.detail
          : JSON.stringify(error.detail || message);
    } catch {
      message = `Request failed (${response.status})`;
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

// Authentication

export async function loginUser(email, password) {
  const formData = new URLSearchParams();
  formData.set("username", email);
  formData.set("password", password);

  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      error.detail || "Invalid email or password"
    );
  }

  const data = await response.json();
  localStorage.setItem("access_token", data.access_token);

  return data;
}

export async function registerUser(user) {
  return apiRequest("/auth/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(user),
  });
}

export async function getCurrentUser() {
  return apiRequest("/auth/me");
}

export function logoutUser() {
  localStorage.removeItem("access_token");
}

// Tickets

export async function getTickets() {
  return apiRequest("/tickets");
}

export async function getTicket(ticketId) {
  return apiRequest(`/tickets/${ticketId}`);
}

export async function createTicket(ticket) {
  return apiRequest("/tickets", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(ticket),
  });
}

export async function getTicketMessages(ticketId) {
  return apiRequest(`/tickets/${ticketId}/messages`);
}

export async function addTicketMessage(ticketId, body) {
  return apiRequest(`/tickets/${ticketId}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ body }),
  });
}

export async function updateTicketStatus(ticketId, status) {
  return apiRequest(`/tickets/${ticketId}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status }),
  });
}

export async function updateTicketPriority(ticketId, priority) {
  return apiRequest(`/tickets/${ticketId}/priority`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ priority }),
  });
}

export async function assignTicket(ticketId, assignedAgentId) {
  return apiRequest(`/tickets/${ticketId}/assign`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      assigned_agent_id: assignedAgentId,
    }),
  });
}

export async function createAgent(agent) {
  return apiRequest("/admin/agents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(agent),
  });
}


export async function getAgents() {
  return apiRequest("/admin/agents");
}


export async function updateAgentStatus(agentId, isActive) {
  return apiRequest(
    `/admin/agents/${agentId}/status?is_active=${isActive}`,
    {
      method: "PATCH",
    }
  );
}