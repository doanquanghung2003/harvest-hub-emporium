const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || "";
const API_PREFIX = API_BASE_URL ? `${API_BASE_URL}/api` : "/api";

const authHeaders = () => {
  const token = localStorage.getItem("token");
  return token
    ? {
        Authorization: `Bearer ${token}`,
      }
    : {};
};

export type Message = {
  senderId: string;
  senderName: string;
  role: "seller" | "customer";
  content: string;
  timestamp: number;
};

export type Conversation = {
  id: string;
  sellerId: string;
  customerId: string;
  orderId: string;
  messages?: Message[];
  createdAt: number;
  updatedAt: number;
};

const normalizeConversation = (payload: Conversation): Conversation => ({
  ...payload,
  messages: payload?.messages ?? [],
});

export const messageService = {
  async getConversationsBySeller(sellerId: string): Promise<Conversation[]> {
    const res = await fetch(`${API_PREFIX}/messages/seller/${sellerId}`, {
      headers: {
        ...authHeaders(),
      },
    });
    if (!res.ok) throw new Error("Không thể tải hội thoại");
    const data = await res.json();
    return Array.isArray(data) ? data.map(normalizeConversation) : [];
  },
  async getConversation(conversationId: string): Promise<Conversation> {
    const res = await fetch(`${API_PREFIX}/messages/${conversationId}`, {
      headers: {
        ...authHeaders(),
      },
    });
    if (!res.ok) throw new Error("Không thể tải chi tiết hội thoại");
    const data = await res.json();
    return normalizeConversation(data);
  },
  async sendMessage(conversationId: string, msg: Message): Promise<Conversation> {
    const res = await fetch(`${API_PREFIX}/messages/${conversationId}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(msg),
    });
    if (!res.ok) throw new Error("Không gửi được tin nhắn");
    const data = await res.json();
    return normalizeConversation(data);
  },
  async getConversationsByCustomer(customerId: string): Promise<Conversation[]> {
    const res = await fetch(`${API_PREFIX}/messages/customer/${customerId}`, {
      headers: {
        ...authHeaders(),
      },
    });
    if (!res.ok) throw new Error("Không thể tải hội thoại của khách hàng");
    const data = await res.json();
    return Array.isArray(data) ? data.map(normalizeConversation) : [];
  },
  async createConversation(params: { sellerId: string; customerId: string; orderId?: string }): Promise<Conversation> {
    const query = new URLSearchParams({
      sellerId: params.sellerId,
      customerId: params.customerId,
      orderId: params.orderId ?? `inquiry-${params.sellerId}`,
    });
    const res = await fetch(`${API_PREFIX}/messages/create?${query.toString()}`, {
      method: "POST",
      headers: {
        ...authHeaders(),
      },
    });
    if (!res.ok) throw new Error("Không thể tạo hội thoại");
    const data = await res.json();
    return normalizeConversation(data);
  },
};
