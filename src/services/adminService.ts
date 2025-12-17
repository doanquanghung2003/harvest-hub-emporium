const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || '';
const API_PREFIX = API_BASE_URL ? `${API_BASE_URL}/api` : "/api";

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

// Seller Management
export const sellerService = {
  // Lấy danh sách seller registrations chờ duyệt
  getPendingSellers: async () => {
    const response = await fetch(`${API_PREFIX}/sellers/pending`);
    if (!response.ok) throw new Error('Failed to fetch pending sellers');
    return response.json();
  },

  // Lấy thống kê seller
  getSellerStats: async () => {
    const response = await fetch(`${API_PREFIX}/sellers/stats`);
    if (!response.ok) throw new Error('Failed to fetch seller stats');
    return response.json();
  },

  // Duyệt seller
  approveSeller: async (id: string, adminId: string) => {
    const response = await fetch(`${API_PREFIX}/sellers/${id}/approve?adminId=${adminId}`, {
      method: 'PUT',
    });
    if (!response.ok) throw new Error('Failed to approve seller');
    return response.json();
  },

  // Từ chối seller
  rejectSeller: async (id: string, adminId: string, reason?: string) => {
    const url = new URL(`${API_PREFIX}/sellers/${id}/reject`);
    url.searchParams.append('adminId', adminId);
    if (reason) url.searchParams.append('reason', reason);
    
    const response = await fetch(url.toString(), {
      method: 'PUT',
    });
    if (!response.ok) throw new Error('Failed to reject seller');
    return response.json();
  },

  // Lấy seller theo ID
  getSellerById: async (id: string) => {
    const response = await fetch(`${API_PREFIX}/sellers/${id}`);
    if (!response.ok) throw new Error('Failed to fetch seller');
    return response.json();
  },

  // Lấy tất cả sellers
  getAllSellers: async () => {
    const response = await fetch(`${API_PREFIX}/sellers`);
    if (!response.ok) throw new Error('Failed to fetch sellers');
    const data = await response.json();
    // Xử lý cả PageResponse và array trực tiếp
    return Array.isArray(data) ? data : (data.content || data);
  }
};

// Product Management
export const productService = {
  // Lấy danh sách sản phẩm chờ duyệt
  getPendingProducts: async () => {
    const response = await fetch(`${API_PREFIX}/products/pending`);
    if (!response.ok) throw new Error('Failed to fetch pending products');
    return response.json();
  },

  // Lấy thống kê sản phẩm
  getProductStats: async () => {
    const response = await fetch(`${API_PREFIX}/products/approval-stats`);
    if (!response.ok) throw new Error('Failed to fetch product stats');
    return response.json();
  },

  // Duyệt sản phẩm
  approveProduct: async (id: string, adminId: string) => {
    const response = await fetch(`${API_PREFIX}/products/${id}/approve?adminId=${adminId}`, {
      method: 'PUT',
    });
    if (!response.ok) throw new Error('Failed to approve product');
    return response.json();
  },

  // Từ chối sản phẩm
  rejectProduct: async (id: string, adminId: string, reason?: string) => {
    const url = new URL(`${API_PREFIX}/products/${id}/reject`);
    url.searchParams.append('adminId', adminId);
    if (reason) url.searchParams.append('reason', reason);
    
    const response = await fetch(url.toString(), {
      method: 'PUT',
    });
    if (!response.ok) throw new Error('Failed to reject product');
    return response.json();
  },

  // Lấy sản phẩm theo ID
  getProductById: async (id: string) => {
    const response = await fetch(`${API_PREFIX}/products/${id}`);
    if (!response.ok) throw new Error('Failed to fetch product');
    return response.json();
  }
};

// User Management
export const userService = {
  // Get all users
  getUsers: async () => {
    const response = await fetch(`${API_PREFIX}/user`);
    if (!response.ok) throw new Error('Failed to fetch users');
    return response.json();
  },

  // Get user by id
  getUserById: async (id: string) => {
    const response = await fetch(`${API_PREFIX}/user/${id}`);
    if (!response.ok) throw new Error('Failed to fetch user');
    return response.json();
  },

  // Create user
  createUser: async (payload: any) => {
    const response = await fetch(`${API_PREFIX}/user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error('Failed to create user');
    return response.json();
  },

  // Update user
  updateUser: async (id: string, payload: any) => {
    console.log('🔄 Updating user:', id, payload);
    const response = await fetch(`${API_PREFIX}/user/${id}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        ...(localStorage.getItem('token') && { Authorization: `Bearer ${localStorage.getItem('token')}` })
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Failed to update user:', response.status, errorText);
      let errorMessage = 'Failed to update user';
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorJson.error || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      throw new Error(errorMessage);
    }
    
    return response.json();
  },

  // Delete user
  deleteUser: async (id: string) => {
    console.log('🗑️ Deleting user:', id);
    const response = await fetch(`${API_PREFIX}/user/${id}`, { 
      method: 'DELETE',
      headers: {
        ...(localStorage.getItem('token') && { Authorization: `Bearer ${localStorage.getItem('token')}` })
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Failed to delete user:', response.status, errorText);
      let errorMessage = 'Failed to delete user';
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorJson.error || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      throw new Error(errorMessage);
    }
    
    return response.json().catch(() => ({})); // Nếu response không có body, return empty object
  }
};

// Order Management (Admin/Seller actions)
export const adminOrderService = {
  getAll: async () => {
    const response = await fetch(`${API_PREFIX}/orders`, {
      headers: {
        ...getAuthHeaders(),
      },
    });
    if (!response.ok) throw new Error('Failed to fetch orders');
    const data = await response.json();
    // Xử lý cả PageResponse và array trực tiếp
    return Array.isArray(data) ? data : (data.content || data);
  },
  confirm: async (id: string) => {
    const resp = await fetch(`${API_PREFIX}/orders/${id}/confirm`, { 
      method: 'PUT',
      headers: {
        ...getAuthHeaders(),
      },
    });
    if (!resp.ok) throw new Error('Failed to confirm order');
    return resp.json();
  },
  pack: async (id: string) => {
    const resp = await fetch(`${API_PREFIX}/orders/${id}/pack`, { 
      method: 'PUT',
      headers: {
        ...getAuthHeaders(),
      },
    });
    if (!resp.ok) throw new Error('Failed to pack order');
    return resp.json();
  },
  handover: async (id: string) => {
    const resp = await fetch(`${API_PREFIX}/orders/${id}/handover`, { 
      method: 'PUT',
      headers: {
        ...getAuthHeaders(),
      },
    });
    if (!resp.ok) throw new Error('Failed to handover order');
    return resp.json();
  },
  deliver: async (id: string) => {
    const resp = await fetch(`${API_PREFIX}/orders/${id}/deliver`, { 
      method: 'PUT',
      headers: {
        ...getAuthHeaders(),
      },
    });
    if (!resp.ok) throw new Error('Failed to deliver order');
    return resp.json();
  },
  cancel: async (id: string) => {
    const resp = await fetch(`${API_PREFIX}/orders/${id}/cancel`, { 
      method: 'PUT',
      headers: {
        ...getAuthHeaders(),
      },
    });
    if (!resp.ok) throw new Error('Failed to cancel order');
    return resp.json();
  },
};

// Notification Management
export const notificationService = {
  // Gửi thông báo đến tất cả user
  sendToAllUsers: async (notification: {
    title: string;
    message: string;
    type: 'INFO' | 'ORDER' | 'PROMO' | 'SYSTEM';
    target: 'ALL' | 'CUSTOMERS' | 'SELLERS';
  }) => {
    const response = await fetch(`${API_PREFIX}/notifications/send-to-all`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(notification)
    });
    if (!response.ok) throw new Error('Failed to send notification');
    return response.json();
  },

  // Lấy danh sách thông báo (tất cả - cho admin)
  getNotifications: async () => {
    try {
      const response = await fetch(`${API_PREFIX}/notifications`, {
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        // Nếu endpoint không tồn tại hoặc lỗi, trả về mảng rỗng
        return [];
      }
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      // Silently fail - trả về mảng rỗng để không crash app
      return [];
    }
  },

  // Lấy thông báo cho user cụ thể
  getUserNotifications: async (userId: string) => {
    const response = await fetch(`${API_PREFIX}/notifications/user/${userId}`);
    if (!response.ok) throw new Error('Failed to fetch user notifications');
    return response.json();
  },

  // Đánh dấu thông báo đã đọc
  markAsRead: async (id: string) => {
    const response = await fetch(`${API_PREFIX}/notifications/${id}/read`, {
      method: 'PUT'
    });
    if (!response.ok) throw new Error('Failed to mark notification as read');
    return response.json();
  },

  // Xóa thông báo
  deleteNotification: async (id: string) => {
    const response = await fetch(`${API_PREFIX}/notifications/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete notification');
    return true;
  },
};
