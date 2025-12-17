const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || '';

export interface Wallet {
  id: string;
  userId: string;
  balance: number;
  currency: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface WalletTransaction {
  id: string;
  walletId: string;
  userId: string;
  type: string; // deposit, withdraw, payment, refund
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  status: string; // pending, completed, failed, cancelled
  description: string;
  referenceId?: string;
  referenceType?: string;
  paymentMethod?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DepositRequest {
  amount: number;
  paymentMethod: string;
  description?: string;
  ipAddress?: string;
  bankCardId?: string;
}

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export const walletService = {
  // Get wallet by user ID
  async getWallet(userId: string): Promise<Wallet> {
    const response = await fetch(`${API_BASE_URL}/api/wallet/${userId}`, {
      headers: authHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch wallet');
    }

    return await response.json();
  },

  // Deposit money to wallet
  async deposit(userId: string, request: DepositRequest): Promise<{ success: boolean; transaction: WalletTransaction; payment?: any }> {
    const response = await fetch(`${API_BASE_URL}/api/wallet/${userId}/deposit`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to deposit' }));
      throw new Error(error.message || 'Failed to deposit');
    }

    return await response.json();
  },

  // Withdraw money from wallet
  async withdraw(userId: string, amount: number, description?: string): Promise<WalletTransaction> {
    const response = await fetch(`${API_BASE_URL}/api/wallet/${userId}/withdraw`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ amount, description }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to withdraw' }));
      throw new Error(error.message || 'Failed to withdraw');
    }

    const result = await response.json();
    return result.transaction;
  },

  // Pay with wallet
  async payWithWallet(userId: string, amount: number, orderId: string, description?: string): Promise<WalletTransaction> {
    const response = await fetch(`${API_BASE_URL}/api/wallet/${userId}/pay`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ amount, orderId, description }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to pay' }));
      throw new Error(error.message || 'Failed to pay with wallet');
    }

    const result = await response.json();
    return result.transaction;
  },

  // Get transaction history
  async getTransactions(userId: string, limit?: number): Promise<WalletTransaction[]> {
    const url = limit 
      ? `${API_BASE_URL}/api/wallet/${userId}/transactions?limit=${limit}`
      : `${API_BASE_URL}/api/wallet/${userId}/transactions`;
    
    const response = await fetch(url, {
      headers: authHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch transactions');
    }

    return await response.json();
  },

  // Complete deposit transaction
  async completeDeposit(transactionId: string): Promise<WalletTransaction> {
    const response = await fetch(`${API_BASE_URL}/api/wallet/transactions/${transactionId}/complete`, {
      method: 'POST',
      headers: authHeaders(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to complete deposit' }));
      throw new Error(error.message || 'Failed to complete deposit');
    }

    const result = await response.json();
    // Response format: { success: true, transaction: {...} }
    return result.transaction || result;
  },
};

