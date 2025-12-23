const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || '';

export interface CartItemDTO {
  productId: string;
  quantity: number;
  price: number;
}

export interface CartDTO {
  id: string;
  userId: string;
  items: CartItemDTO[];
  totalPrice: number;
  createdAt: number;
  updatedAt: number;
  voucherCode?: string;
  discountAmount?: number;
  subtotal?: number;
}

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export const cartService = {
  async getUserCart(userId: string): Promise<CartDTO | null> {
    const res = await fetch(`${API_BASE_URL}/api/carts/user/${userId}`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Không thể tải giỏ hàng');
    const list = await res.json();
    return Array.isArray(list) && list.length > 0 ? list[0] : null;
  },

  async addItem(userId: string, productId: string, quantity = 1): Promise<CartDTO> {
    const url = `${API_BASE_URL}/api/carts/user/${userId}/items?productId=${encodeURIComponent(productId)}&quantity=${quantity}`;
    const res = await fetch(url, { method: 'POST', headers: authHeaders() });
    if (!res.ok) throw new Error('Không thể thêm sản phẩm vào giỏ hàng');
    const data = await res.json();
    try { window.dispatchEvent(new CustomEvent('cart:updated')); } catch {}
    return data;
  },

  async updateItem(userId: string, productId: string, quantity: number): Promise<CartDTO> {
    const url = `${API_BASE_URL}/api/carts/user/${userId}/items/${encodeURIComponent(productId)}?quantity=${quantity}`;
    const res = await fetch(url, { method: 'PUT', headers: authHeaders() });
    if (!res.ok) throw new Error('Không thể cập nhật sản phẩm trong giỏ hàng');
    const data = await res.json();
    try { window.dispatchEvent(new CustomEvent('cart:updated')); } catch {}
    return data;
  },

  async removeItem(userId: string, productId: string): Promise<CartDTO> {
    const url = `${API_BASE_URL}/api/carts/user/${userId}/items/${encodeURIComponent(productId)}`;
    const res = await fetch(url, { method: 'DELETE', headers: authHeaders() });
    if (!res.ok) throw new Error('Không thể xóa sản phẩm khỏi giỏ hàng');
    const data = await res.json();
    try { window.dispatchEvent(new CustomEvent('cart:updated')); } catch {}
    return data;
  },

  async clear(userId: string): Promise<CartDTO> {
    const res = await fetch(`${API_BASE_URL}/api/carts/user/${userId}/clear`, { method: 'DELETE', headers: authHeaders() });
    if (!res.ok) throw new Error('Không thể xóa toàn bộ giỏ hàng');
    const data = await res.json();
    try { window.dispatchEvent(new CustomEvent('cart:updated')); } catch {}
    return data;
  },

  async applyVoucher(userId: string, voucherCode: string): Promise<CartDTO> {
    const url = `${API_BASE_URL}/api/carts/user/${userId}/apply-voucher?voucherCode=${encodeURIComponent(voucherCode)}`;
    const res = await fetch(url, { method: 'POST', headers: authHeaders() });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Không thể áp dụng voucher' }));
      throw new Error(error.message || 'Không thể áp dụng voucher');
    }
    const data = await res.json();
    try { window.dispatchEvent(new CustomEvent('cart:updated')); } catch {}
    return data;
  },

  async removeVoucher(userId: string): Promise<CartDTO> {
    const res = await fetch(`${API_BASE_URL}/api/carts/user/${userId}/voucher`, { method: 'DELETE', headers: authHeaders() });
    if (!res.ok) throw new Error('Không thể xóa voucher');
    const data = await res.json();
    try { window.dispatchEvent(new CustomEvent('cart:updated')); } catch {}
    return data;
  },
};


