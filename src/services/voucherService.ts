const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || '';

export interface Voucher {
  id: string;
  code: string;
  name: string;
  description: string;
  type: 'percentage' | 'fixed_amount' | 'free_shipping';
  value: number;
  minOrderAmount: number;
  maxDiscountAmount: number;
  shopId?: string;
  categoryIds?: string[];
  productIds?: string[];
  userIds?: string[];
  usageLimit: number;
  usedCount: number;
  startDate: string;
  endDate: string;
  status: 'active' | 'inactive' | 'expired';
  imageUrl?: string;
  maxUsagePerUser: number;
  isStackable: boolean;
  membershipType?: string;
}

export interface UserVoucher {
  id: string;
  userId: string;
  voucherId: string;
  voucherCode: string;
  receivedAt: string;
  expiresAt: string;
  isUsed: boolean;
  usedAt?: string;
  orderId?: string;
}

export interface VoucherEligibilityResponse {
  userVoucher: UserVoucher;
  voucher: Voucher;
  eligible: boolean;
  discountAmount: number;
  reason?: string; // Reason if not eligible
}

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export const voucherService = {
  // Get all vouchers
  async getAllVouchers(): Promise<Voucher[]> {
    const res = await fetch(`${API_BASE_URL}/api/vouchers`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed to load vouchers');
    return res.json();
  },

  // Get active vouchers
  async getActiveVouchers(): Promise<Voucher[]> {
    const res = await fetch(`${API_BASE_URL}/api/vouchers/active`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed to load active vouchers');
    return res.json();
  },

  // Get voucher by code
  async getVoucherByCode(code: string): Promise<Voucher | null> {
    const res = await fetch(`${API_BASE_URL}/api/vouchers/code/${encodeURIComponent(code)}`, { headers: authHeaders() });
    if (!res.ok) return null;
    return res.json();
  },

  // Get user's vouchers
  async getMyVouchers(userId: string): Promise<UserVoucher[]> {
    const res = await fetch(`${API_BASE_URL}/api/vouchers/my-vouchers/${userId}`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed to load my vouchers');
    return res.json();
  },

  // Get user's active vouchers
  async getMyActiveVouchers(userId: string): Promise<UserVoucher[]> {
    const res = await fetch(`${API_BASE_URL}/api/vouchers/my-vouchers/${userId}/active`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed to load active vouchers');
    return res.json();
  },

  // Get user's vouchers with eligibility info for cart
  async getMyVouchersForCart(
    userId: string,
    subtotal: number,
    shopId?: string,
    productIds?: string[],
    categoryIds?: string[]
  ): Promise<VoucherEligibilityResponse[]> {
    const params = new URLSearchParams({
      subtotal: subtotal.toString(),
    });
    if (shopId) params.append('shopId', shopId);
    if (productIds && productIds.length > 0) {
      productIds.forEach(id => params.append('productIds', id));
    }
    if (categoryIds && categoryIds.length > 0) {
      categoryIds.forEach(id => params.append('categoryIds', id));
    }
    
    const res = await fetch(`${API_BASE_URL}/api/vouchers/my-vouchers/${userId}/for-cart?${params}`, { 
      headers: authHeaders() 
    });
    if (!res.ok) throw new Error('Failed to load vouchers for cart');
    return res.json();
  },

  // Get eligible vouchers for order
  async getEligibleVouchers(
    userId: string,
    orderAmount: number,
    shopId?: string,
    productIds?: string[],
    categoryIds?: string[]
  ): Promise<Voucher[]> {
    const params = new URLSearchParams({
      userId,
      orderAmount: orderAmount.toString(),
    });
    if (shopId) params.append('shopId', shopId);
    if (productIds && productIds.length > 0) {
      productIds.forEach(id => params.append('productIds', id));
    }
    if (categoryIds && categoryIds.length > 0) {
      categoryIds.forEach(id => params.append('categoryIds', id));
    }
    
    const res = await fetch(`${API_BASE_URL}/api/vouchers/eligible?${params}`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed to load eligible vouchers');
    return res.json();
  },

  // Validate voucher
  async validateVoucher(
    code: string,
    userId: string,
    orderAmount: number,
    shopId?: string,
    productIds?: string[],
    categoryIds?: string[]
  ): Promise<boolean> {
    const res = await fetch(`${API_BASE_URL}/api/vouchers/validate-for-order`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        code,
        userId,
        orderAmount,
        shopId,
        productIds: productIds || [],
        categoryIds: categoryIds || [],
      }),
    });
    if (!res.ok) return false;
    return res.json();
  },

  // Calculate discount
  async calculateDiscount(code: string, orderAmount: number): Promise<number> {
    const res = await fetch(`${API_BASE_URL}/api/vouchers/calculate-discount`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ code, orderAmount }),
    });
    if (!res.ok) return 0;
    return res.json();
  },

  // Apply voucher to cart
  async applyVoucherToCart(userId: string, voucherCode: string, cartSubtotal: number): Promise<number> {
    const res = await fetch(`${API_BASE_URL}/api/vouchers/apply-to-cart`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ userId, voucherCode, cartSubtotal }),
    });
    if (!res.ok) throw new Error('Failed to apply voucher');
    return res.json();
  },

  // Admin methods
  async createVoucher(voucher: Partial<Voucher>): Promise<Voucher> {
    const res = await fetch(`${API_BASE_URL}/api/admin/vouchers`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(voucher),
    });
    if (!res.ok) throw new Error('Failed to create voucher');
    return res.json();
  },

  async updateVoucher(id: string, voucher: Partial<Voucher>): Promise<Voucher> {
    const res = await fetch(`${API_BASE_URL}/api/admin/vouchers/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(voucher),
    });
    if (!res.ok) throw new Error('Failed to update voucher');
    return res.json();
  },

  async deleteVoucher(id: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/api/admin/vouchers/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error('Failed to delete voucher');
  },

  async updateVoucherStatus(id: string, status: string): Promise<Voucher> {
    const res = await fetch(`${API_BASE_URL}/api/admin/vouchers/${id}/status?status=${status}`, {
      method: 'PATCH',
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error('Failed to update voucher status');
    return res.json();
  },

  async grantVoucherToUser(userId: string, voucherId: string): Promise<UserVoucher> {
    const res = await fetch(`${API_BASE_URL}/api/admin/vouchers/grant`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ userId, voucherId }),
    });
    if (!res.ok) throw new Error('Failed to grant voucher');
    return res.json();
  },

  async getVoucherStatistics(): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/api/admin/vouchers/statistics`, {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error('Failed to load statistics');
    return res.json();
  },

  // Seller methods
  async createShopVoucher(shopId: string, voucher: Partial<Voucher>): Promise<Voucher> {
    const res = await fetch(`${API_BASE_URL}/api/seller/vouchers?shopId=${shopId}`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(voucher),
    });
    if (!res.ok) throw new Error('Failed to create voucher');
    return res.json();
  },

  async updateShopVoucher(id: string, shopId: string, voucher: Partial<Voucher>): Promise<Voucher> {
    const res = await fetch(`${API_BASE_URL}/api/seller/vouchers/${id}?shopId=${shopId}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(voucher),
    });
    if (!res.ok) throw new Error('Failed to update voucher');
    return res.json();
  },

  async deleteShopVoucher(id: string, shopId: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/api/seller/vouchers/${id}?shopId=${shopId}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error('Failed to delete voucher');
  },

  async getShopVouchers(shopId: string): Promise<Voucher[]> {
    const res = await fetch(`${API_BASE_URL}/api/seller/vouchers/shop/${shopId}`, {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error('Failed to load shop vouchers');
    return res.json();
  },

  async getShopVoucherStatistics(shopId: string): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/api/seller/vouchers/shop/${shopId}/statistics`, {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error('Failed to load statistics');
    return res.json();
  },
};

