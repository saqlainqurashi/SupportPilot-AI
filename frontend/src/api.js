
const API_URL = "http://localhost:8000";

export async function getTickets() {
  const response = await fetch(`${API_URL}/tickets`);

  if (!response.ok) {
    throw new Error("Failed to load tickets");
  }

  return response.json();
}

export async function createTicket(ticket) {
  const response = await fetch(`${API_URL}/tickets`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(ticket),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      error.detail
        ? JSON.stringify(error.detail)
        : "Failed to create ticket"
    );
  }

  return response.json();
}



export async function getTicketMessages(ticketId) {
  const response = await fetch(
    `${API_URL}/tickets/${ticketId}/messages`
  );

  if (!response.ok) {
    throw new Error("Failed to load conversation");
  }

  return response.json();
}

export async function updateTicketStatus(ticketId, status) {
  const response = await fetch(
    `${API_URL}/tickets/${ticketId}/status`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to update ticket");
  }

  return response.json();
}

export async function addTicketMessage(ticketId, body) {
  const response = await fetch(
    `${API_URL}/tickets/${ticketId}/messages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        author_type: "support",
        body,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to send message");
  }

  return response.json();
}

