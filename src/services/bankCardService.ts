// Đọc base URL từ env để có thể gọi trực tiếp backend
const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || '';

export interface BankCard {
  id: string;
  userId: string;
  cardNumber: string;
  cardNumberMasked: string;
  cardHolderName: string;
  bankName: string;
  bankCode: string;
  expiryMonth: string;
  expiryYear: string;
  cardType: string; // debit, credit, prepaid
  isDefault: boolean;
  status: string; // active, inactive, expired
  createdAt: string;
  updatedAt: string;
}

export interface CreateBankCardRequest {
  cardNumber: string;
  cardHolderName: string;
  bankName: string;
  bankCode: string;
  expiryMonth: string;
  expiryYear: string;
  cardType: string;
  isDefault?: boolean;
}

class BankCardService {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  /**
   * Get all bank cards for a user
   */
  async getBankCards(userId: string): Promise<BankCard[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/bank-cards/user/${userId}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Không thể lấy danh sách thẻ ngân hàng');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching bank cards:', error);
      throw error;
    }
  }

  /**
   * Get bank card by ID
   */
  async getBankCard(cardId: string, userId: string): Promise<BankCard> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/bank-cards/${cardId}?userId=${userId}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Không thể lấy thông tin thẻ ngân hàng');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching bank card:', error);
      throw error;
    }
  }

  /**
   * Add a new bank card
   */
  async addBankCard(userId: string, cardData: CreateBankCardRequest): Promise<BankCard> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/bank-cards/user/${userId}`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(cardData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Không thể thêm thẻ ngân hàng');
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Error adding bank card:', error);
      throw error;
    }
  }

  /**
   * Update bank card
   */
  async updateBankCard(
    cardId: string,
    userId: string,
    cardData: Partial<CreateBankCardRequest>
  ): Promise<BankCard> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/bank-cards/${cardId}?userId=${userId}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(cardData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Không thể cập nhật thẻ ngân hàng');
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Error updating bank card:', error);
      throw error;
    }
  }

  /**
   * Set card as default
   */
  async setDefaultCard(cardId: string, userId: string): Promise<void> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/bank-cards/${cardId}/set-default?userId=${userId}`,
        {
          method: 'PUT',
          headers: this.getAuthHeaders(),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Không thể đặt thẻ làm mặc định');
      }
    } catch (error) {
      console.error('Error setting default card:', error);
      throw error;
    }
  }

  /**
   * Delete bank card
   */
  async deleteBankCard(cardId: string, userId: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/bank-cards/${cardId}?userId=${userId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Không thể xóa thẻ ngân hàng');
      }
    } catch (error) {
      console.error('Error deleting bank card:', error);
      throw error;
    }
  }

  /**
   * Mask card number (show only last 4 digits)
   */
  maskCardNumber(cardNumber: string): string {
    if (!cardNumber || cardNumber.length < 4) {
      return '****';
    }
    const last4 = cardNumber.slice(-4);
    return `**** **** **** ${last4}`;
  }
}

export const bankCardService = new BankCardService();

