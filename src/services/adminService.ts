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
    const response = await fetch(`${API_PREFIX}/sellers/pending`, {
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) throw new Error('Không thể tải danh sách người bán chờ duyệt');
    return response.json();
  },

  // Lấy thống kê seller
  getSellerStats: async () => {
    const response = await fetch(`${API_PREFIX}/sellers/stats`, {
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) throw new Error('Không thể tải thống kê người bán');
    return response.json();
  },

  // Duyệt seller
  approveSeller: async (id: string, adminId: string) => {
    const response = await fetch(`${API_PREFIX}/sellers/${id}/approve?adminId=${adminId}`, {
      method: 'PUT',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) throw new Error('Không thể duyệt người bán');
    return response.json();
  },

  // Từ chối seller
  rejectSeller: async (id: string, adminId: string, reason?: string) => {
    const url = new URL(`${API_PREFIX}/sellers/${id}/reject`);
    url.searchParams.append('adminId', adminId);
    if (reason) url.searchParams.append('reason', reason);
    
    const response = await fetch(url.toString(), {
      method: 'PUT',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) throw new Error('Không thể từ chối người bán');
    return response.json();
  },

  // Lấy seller theo ID
  getSellerById: async (id: string) => {
    const response = await fetch(`${API_PREFIX}/sellers/${id}`);
    if (!response.ok) throw new Error('Không thể tải thông tin người bán');
    return response.json();
  },

  // Lấy tất cả sellers
  getAllSellers: async () => {
    const response = await fetch(`${API_PREFIX}/sellers`);
    if (!response.ok) throw new Error('Không thể tải danh sách người bán');
    const data = await response.json();
    // Xử lý cả PageResponse và array trực tiếp
    return Array.isArray(data) ? data : (data.content || data);
  }
};

// Product Management
export const productService = {
  // Lấy danh sách sản phẩm chờ duyệt
  getPendingProducts: async () => {
    const response = await fetch(`${API_PREFIX}/products/pending`, {
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) throw new Error('Không thể tải danh sách sản phẩm chờ duyệt');
    return response.json();
  },

  // Lấy thống kê sản phẩm
  getProductStats: async () => {
    const response = await fetch(`${API_PREFIX}/products/approval-stats`, {
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) throw new Error('Không thể tải thống kê sản phẩm');
    return response.json();
  },

  // Duyệt sản phẩm
  approveProduct: async (id: string, adminId: string) => {
    const response = await fetch(`${API_PREFIX}/products/${id}/approve?adminId=${adminId}`, {
      method: 'PUT',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) throw new Error('Không thể duyệt sản phẩm');
    return response.json();
  },

  // Từ chối sản phẩm
  rejectProduct: async (id: string, adminId: string, reason?: string) => {
    const url = new URL(`${API_PREFIX}/products/${id}/reject`);
    url.searchParams.append('adminId', adminId);
    if (reason) url.searchParams.append('reason', reason);
    
    const response = await fetch(url.toString(), {
      method: 'PUT',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) throw new Error('Không thể từ chối sản phẩm');
    return response.json();
  },

  // Lấy sản phẩm theo ID
  getProductById: async (id: string) => {
    const response = await fetch(`${API_PREFIX}/products/${id}`);
    if (!response.ok) throw new Error('Không thể tải thông tin sản phẩm');
    return response.json();
  }
};

// User Management
export const userService = {
  // Get all users
  getUsers: async () => {
    const response = await fetch(`${API_PREFIX}/user`, {
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) throw new Error('Không thể tải danh sách người dùng');
    return response.json();
  },

  // Get user by id
  getUserById: async (id: string) => {
    const response = await fetch(`${API_PREFIX}/user/${id}`, {
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) throw new Error('Không thể tải thông tin người dùng');
    return response.json();
  },

  // Create user
  createUser: async (payload: any) => {
    const response = await fetch(`${API_PREFIX}/user`, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error('Không thể tạo người dùng');
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
      let errorMessage = 'Không thể cập nhật người dùng';
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
      let errorMessage = 'Không thể xóa người dùng';
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
    if (!response.ok) throw new Error('Không thể tải danh sách đơn hàng');
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
    if (!resp.ok) throw new Error('Không thể xác nhận đơn hàng');
    return resp.json();
  },
  pack: async (id: string) => {
    const resp = await fetch(`${API_PREFIX}/orders/${id}/pack`, { 
      method: 'PUT',
      headers: {
        ...getAuthHeaders(),
      },
    });
    if (!resp.ok) throw new Error('Không thể đóng gói đơn hàng');
    return resp.json();
  },
  handover: async (id: string) => {
    const resp = await fetch(`${API_PREFIX}/orders/${id}/handover`, { 
      method: 'PUT',
      headers: {
        ...getAuthHeaders(),
      },
    });
    if (!resp.ok) throw new Error('Không thể bàn giao đơn hàng');
    return resp.json();
  },
  deliver: async (id: string) => {
    const resp = await fetch(`${API_PREFIX}/orders/${id}/deliver`, { 
      method: 'PUT',
      headers: {
        ...getAuthHeaders(),
      },
    });
    if (!resp.ok) throw new Error('Không thể giao đơn hàng');
    return resp.json();
  },
  cancel: async (id: string) => {
    const resp = await fetch(`${API_PREFIX}/orders/${id}/cancel`, { 
      method: 'PUT',
      headers: {
        ...getAuthHeaders(),
      },
    });
    if (!resp.ok) throw new Error('Không thể hủy đơn hàng');
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
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(notification)
    });
    if (!response.ok) throw new Error('Không thể gửi thông báo');
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
    if (!response.ok) throw new Error('Không thể tải thông báo người dùng');
    return response.json();
  },

  // Đánh dấu thông báo đã đọc
  markAsRead: async (id: string) => {
    const response = await fetch(`${API_PREFIX}/notifications/${id}/read`, {
      method: 'PUT',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) throw new Error('Không thể đánh dấu thông báo đã đọc');
    return response.json();
  },

  // Xóa thông báo
  deleteNotification: async (id: string) => {
    const response = await fetch(`${API_PREFIX}/notifications/${id}`, {
      method: 'DELETE',
      headers: {
        ...getAuthHeaders(),
      },
    });
    if (!response.ok) throw new Error('Không thể xóa thông báo');
    return true;
  },
};
