const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || '';

export interface PaymentRequest {
  orderId: string;
  userId: string;
  amount: number;
  method: string;
  ipAddress?: string;
  bankCardId?: string;
}

export interface Payment {
  id: string;
  orderId: string;
  userId: string;
  amount: number;
  method: string;
  status: string;
  paymentUrl?: string;
  transactionId?: string;
  createdAt?: string;
  updatedAt?: string;
}

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export const paymentService = {
  // Create online payment and get payment URL
  async createOnlinePayment(request: PaymentRequest): Promise<Payment> {
    try {
      // Get client IP (fallback to localhost)
      const ipAddress = request.ipAddress || '127.0.0.1';
      
      const response = await fetch(`${API_BASE_URL}/api/payments/create-online`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          ...request,
          ipAddress
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create payment');
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating online payment:', error);
      throw error;
    }
  },

  // Get payment by ID
  async getPaymentById(paymentId: string): Promise<Payment> {
    const response = await fetch(`${API_BASE_URL}/api/payments/${paymentId}`, {
      headers: authHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch payment');
    }

    return await response.json();
  },

  // Get payment by order ID
  async getPaymentByOrderId(orderId: string): Promise<Payment | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/payments/order/${orderId}`, {
        headers: authHeaders(),
      });

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch payment');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching payment:', error);
      return null;
    }
  },

  // Verify payment status
  async verifyPayment(paymentId: string): Promise<Payment> {
    const response = await fetch(`${API_BASE_URL}/api/payments/${paymentId}`, {
      headers: authHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to verify payment');
    }

    return await response.json();
  },
};

