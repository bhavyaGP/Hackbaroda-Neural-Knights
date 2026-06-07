const BASE = "http://localhost:8000";

export const api = {
  async startConversation(customer_id, channel = "chat") {
    const res = await fetch(`${BASE}/api/chat/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customer_id, channel }),
    });
    return res.json();
  },

  async sendMessage(customer_id, conversation_id, content) {
    const res = await fetch(`${BASE}/api/chat/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customer_id, conversation_id, content }),
    });
    return res.json();
  },

  async getHistory(conv_id) {
    const res = await fetch(`${BASE}/api/chat/${conv_id}/history`);
    return res.json();
  },

  async getConversations() {
    const res = await fetch(`${BASE}/api/dashboard/conversations`);
    return res.json();
  },

  async getIntelligence(conv_id) {
    const res = await fetch(`${BASE}/api/dashboard/conversations/${conv_id}/intelligence`);
    return res.json();
  },

  async getMetrics() {
    const res = await fetch(`${BASE}/api/dashboard/metrics`);
    return res.json();
  },

  async intervene(conversation_id, instruction) {
    const res = await fetch(`${BASE}/api/dashboard/intervene`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversation_id, instruction }),
    });
    return res.json();
  },

  async getCustomers() {
    const res = await fetch(`${BASE}/api/customers/`);
    return res.json();
  },

  async getCustomerProfile(customer_id) {
    const res = await fetch(`${BASE}/api/customers/${customer_id}/profile`);
    return res.json();
  },
};

export function createWS(path) {
  return new WebSocket(`ws://localhost:8000${path}`);
}
