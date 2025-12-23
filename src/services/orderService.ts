const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || '';

export interface OrderDTO {
  id: string;
  productId?: string;
  userId: string;
  quantity?: number;
  totalPrice: number;
  // Optional fields for UI compatibility
  status?: string;
  date?: string;
  total?: string;
  createdAt?: number | string;
  updatedAt?: number | string;
  paymentMethod?: string;
  paymentStatus?: string;
  shippingFee?: number;
  shippingAddress?: string | {
    address: string;
    city: string;
    district?: string;
    ward?: string;
  };
  items?: Array<{ 
    productId: string; 
    productName?: string; 
    name?: string;
    nameSnapshot?: string;
    imageSnapshot?: string;
    quantity: number; 
    price?: string | number;
    unitPrice?: number;
  }>;
}

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export const orderService = {
  async getOrdersByUser(userId: string): Promise<OrderDTO[]> {
    const res = await fetch(`${API_BASE_URL}/api/orders/user/${userId}`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Không thể tải danh sách đơn hàng');
    const data = await res.json();
    // Xử lý cả PageResponse và array trực tiếp
    return Array.isArray(data) ? data : (data.content || data);
  },

  async getAllOrders(): Promise<OrderDTO[]> {
    const res = await fetch(`${API_BASE_URL}/api/orders`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Không thể tải danh sách đơn hàng');
    const data = await res.json();
    // Xử lý cả PageResponse và array trực tiếp
    return Array.isArray(data) ? data : (data.content || data);
  },

  async getOrderById(orderId: string): Promise<OrderDTO> {
    const res = await fetch(`${API_BASE_URL}/api/orders/${orderId}`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Không thể tải thông tin đơn hàng');
    return res.json();
  },

  async checkout(userId: string, checkoutData?: {
    paymentMethod?: string;
    shippingMethod?: string;
    voucherCode?: string;
    shippingAddress?: {
      fullName?: string;
      phone?: string;
      address?: string;
      city?: string;
      district?: string;
      ward?: string;
      note?: string;
    };
  }): Promise<OrderDTO[]> {
    const res = await fetch(`${API_BASE_URL}/api/orders/checkout/${userId}`, { 
      method: 'POST', 
      headers: authHeaders(),
      body: checkoutData ? JSON.stringify(checkoutData) : undefined
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Đặt hàng thất bại' }));
      throw new Error(error.message || 'Đặt hàng thất bại');
    }
    return res.json();
  },

  // Admin order management methods
  async confirmOrder(orderId: string): Promise<OrderDTO> {
    const res = await fetch(`${API_BASE_URL}/api/orders/${orderId}/confirm`, { 
      method: 'PUT', 
      headers: authHeaders() 
    });
    if (!res.ok) throw new Error('Không thể xác nhận đơn hàng');
    return res.json();
  },

  async packOrder(orderId: string): Promise<OrderDTO> {
    const res = await fetch(`${API_BASE_URL}/api/orders/${orderId}/pack`, { 
      method: 'PUT', 
      headers: authHeaders() 
    });
    if (!res.ok) throw new Error('Không thể đóng gói đơn hàng');
    return res.json();
  },

  async handoverOrder(orderId: string): Promise<OrderDTO> {
    const res = await fetch(`${API_BASE_URL}/api/orders/${orderId}/handover`, { 
      method: 'PUT', 
      headers: authHeaders() 
    });
    if (!res.ok) throw new Error('Không thể bàn giao đơn hàng');
    return res.json();
  },

  async deliverOrder(orderId: string): Promise<OrderDTO> {
    const res = await fetch(`${API_BASE_URL}/api/orders/${orderId}/deliver`, { 
      method: 'PUT', 
      headers: authHeaders() 
    });
    if (!res.ok) throw new Error('Không thể giao đơn hàng');
    return res.json();
  },

  async cancelOrder(orderId: string): Promise<OrderDTO> {
    const res = await fetch(`${API_BASE_URL}/api/orders/${orderId}/cancel`, { 
      method: 'PUT', 
      headers: authHeaders() 
    });
    if (!res.ok) throw new Error('Không thể hủy đơn hàng');
    return res.json();
  },

  // Customer order management methods
  async cancelMyOrder(orderId: string): Promise<OrderDTO> {
    const res = await fetch(`${API_BASE_URL}/api/orders/${orderId}/cancel`, { 
      method: 'PUT', 
      headers: authHeaders() 
    });
    if (!res.ok) throw new Error('Không thể hủy đơn hàng');
    return res.json();
  },
};


