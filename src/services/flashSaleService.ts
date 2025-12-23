const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || '';

export interface FlashSaleProduct {
  productId: string;
  productName: string;
  productImage: string;
  originalPrice: number;
  flashSalePrice: number;
  flashSaleStock: number;
  soldCount: number;
  maxQuantityPerUser: number;
  discountPercentage?: number;
  remainingStock?: number;
}

export interface FlashSale {
  id: string;
  name: string;
  description: string;
  banner: string;
  startTime: string;
  endTime: string;
  status: 'upcoming' | 'active' | 'ended' | 'cancelled';
  products: FlashSaleProduct[];
  createdAt?: string;
  updatedAt?: string;
}

class FlashSaleService {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  // Chuyển đổi đường dẫn ảnh tương đối thành đường dẫn đầy đủ
  private getFullImageUrl(imagePath: string): string {
    if (!imagePath) return '';
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }
    if (imagePath.startsWith('/uploads/')) {
      if (API_BASE_URL) {
        return `${API_BASE_URL}${imagePath}`;
      }
      return imagePath;
    }
    return imagePath;
  }

  // Lấy tất cả flash sales
  async getAllFlashSales(): Promise<FlashSale[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/flashsales`, {
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Không thể tải danh sách flash sale');
      }

      const data = await response.json();
      const flashSales = Array.isArray(data) ? data : [];
      
      // Xử lý ảnh và tính toán các giá trị phụ
      return flashSales.map((fs: FlashSale) => ({
        ...fs,
        banner: this.getFullImageUrl(fs.banner),
        products: (fs.products || []).map((p: FlashSaleProduct) => ({
          ...p,
          productImage: this.getFullImageUrl(p.productImage),
          discountPercentage: p.discountPercentage || 
            ((p.originalPrice - p.flashSalePrice) / p.originalPrice * 100),
          remainingStock: p.remainingStock || (p.flashSaleStock - p.soldCount),
        })),
      }));
    } catch (error) {
      console.error('Error fetching flash sales:', error);
      throw error;
    }
  }

  // Lấy flash sale theo ID
  async getFlashSaleById(id: string): Promise<FlashSale | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/flashsales/${id}`, {
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error('Không thể tải thông tin flash sale');
      }

      const flashSale = await response.json();
      return {
        ...flashSale,
        banner: this.getFullImageUrl(flashSale.banner),
        products: (flashSale.products || []).map((p: FlashSaleProduct) => ({
          ...p,
          productImage: this.getFullImageUrl(p.productImage),
          discountPercentage: p.discountPercentage || 
            ((p.originalPrice - p.flashSalePrice) / p.originalPrice * 100),
          remainingStock: p.remainingStock || (p.flashSaleStock - p.soldCount),
        })),
      };
    } catch (error) {
      console.error('Error fetching flash sale:', error);
      throw error;
    }
  }

  // Lấy các flash sale đang hoạt động
  async getActiveFlashSales(): Promise<FlashSale[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/flashsales/active`, {
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Không thể tải danh sách flash sale đang hoạt động');
      }

      const data = await response.json();
      const flashSales = Array.isArray(data) ? data : [];
      
      return flashSales.map((fs: FlashSale) => ({
        ...fs,
        banner: this.getFullImageUrl(fs.banner),
        products: (fs.products || []).map((p: FlashSaleProduct) => ({
          ...p,
          productImage: this.getFullImageUrl(p.productImage),
          discountPercentage: p.discountPercentage || 
            ((p.originalPrice - p.flashSalePrice) / p.originalPrice * 100),
          remainingStock: p.remainingStock || (p.flashSaleStock - p.soldCount),
        })),
      }));
    } catch (error) {
      console.error('Error fetching active flash sales:', error);
      throw error;
    }
  }

  // Lấy các flash sale sắp diễn ra
  async getUpcomingFlashSales(): Promise<FlashSale[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/flashsales/upcoming`, {
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Không thể tải danh sách flash sale sắp diễn ra');
      }

      const data = await response.json();
      const flashSales = Array.isArray(data) ? data : [];
      
      return flashSales.map((fs: FlashSale) => ({
        ...fs,
        banner: this.getFullImageUrl(fs.banner),
        products: (fs.products || []).map((p: FlashSaleProduct) => ({
          ...p,
          productImage: this.getFullImageUrl(p.productImage),
          discountPercentage: p.discountPercentage || 
            ((p.originalPrice - p.flashSalePrice) / p.originalPrice * 100),
          remainingStock: p.remainingStock || (p.flashSaleStock - p.soldCount),
        })),
      }));
    } catch (error) {
      console.error('Error fetching upcoming flash sales:', error);
      throw error;
    }
  }

  // Lấy các flash sale đã kết thúc
  async getEndedFlashSales(): Promise<FlashSale[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/flashsales/ended`, {
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Không thể tải danh sách flash sale đã kết thúc');
      }

      const data = await response.json();
      const flashSales = Array.isArray(data) ? data : [];
      
      return flashSales.map((fs: FlashSale) => ({
        ...fs,
        banner: this.getFullImageUrl(fs.banner),
        products: (fs.products || []).map((p: FlashSaleProduct) => ({
          ...p,
          productImage: this.getFullImageUrl(p.productImage),
          discountPercentage: p.discountPercentage || 
            ((p.originalPrice - p.flashSalePrice) / p.originalPrice * 100),
          remainingStock: p.remainingStock || (p.flashSaleStock - p.soldCount),
        })),
      }));
    } catch (error) {
      console.error('Error fetching ended flash sales:', error);
      throw error;
    }
  }

  // Lấy thời gian còn lại của flash sale (tính bằng giây)
  async getRemainingTime(id: string): Promise<number> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/flashsales/${id}/remaining-time`, {
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Không thể tải thời gian còn lại');
      }

      const seconds = await response.json();
      return typeof seconds === 'number' ? seconds : 0;
    } catch (error) {
      console.error('Error fetching remaining time:', error);
      return 0;
    }
  }

  // Kiểm tra flash sale có đang hoạt động không
  async isFlashSaleActive(id: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/flashsales/${id}/active`, {
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        return false;
      }

      const isActive = await response.json();
      return isActive === true;
    } catch (error) {
      console.error('Error checking flash sale status:', error);
      return false;
    }
  }
}

export const flashSaleService = new FlashSaleService();

