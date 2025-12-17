const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || '';

export interface ReviewDTO {
  id: string;
  productId: string;
  orderId: string;
  userId: string;
  userName?: string;
  userAvatar?: string;
  rating: number;
  comment?: string;
  images?: string[];
  isVerified?: boolean;
  status?: string;
  helpfulCount?: number;
  createdAt?: string;
}

export interface CreateReviewPayload {
  productId: string;
  rating: number;
  comment?: string;
  images?: string[];
}

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

const handleApiResponse = async <T>(res: Response): Promise<T> => {
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.success === false) {
    const errorMessage = data?.error?.message || data?.message || 'Không thể xử lý yêu cầu';
    throw new Error(errorMessage);
  }
  return (data?.data ?? data) as T;
};

export const reviewService = {
  async submitOrderReview(orderId: string, payload: CreateReviewPayload): Promise<ReviewDTO> {
    const res = await fetch(`${API_BASE_URL}/api/reviews/orders/${orderId}`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    return handleApiResponse<ReviewDTO>(res);
  },

  async getReviewsByProduct(productId: string): Promise<ReviewDTO[]> {
    try {
      // Thử load tất cả reviews trước (không filter theo status)
      const res = await fetch(`${API_BASE_URL}/api/reviews/product/${productId}`);
      if (!res.ok) {
        console.error('Failed to fetch reviews:', res.status, res.statusText);
        const errorText = await res.text();
        console.error('Error response:', errorText);
        throw new Error('Không thể tải đánh giá sản phẩm');
      }
      const data = await res.json();
      console.log('Raw API response:', data);
      
      // Xử lý cả array và object
      let reviewsArray: any[] = [];
      if (Array.isArray(data)) {
        reviewsArray = data;
      } else if (data && typeof data === 'object') {
        // Nếu là object, có thể là PageResponse hoặc object có property content
        reviewsArray = data.content || data.data || [data];
      }
      
      // Map _id thành id và đảm bảo format đúng
      const mappedReviews: ReviewDTO[] = reviewsArray.map((review: any) => ({
        id: review.id || review._id?.toString() || review._id || '',
        productId: review.productId || '',
        orderId: review.orderId || '',
        userId: review.userId || '',
        userName: review.userName || 'Người dùng',
        userAvatar: review.userAvatar,
        rating: review.rating || 0,
        comment: review.comment || '',
        images: review.images || [],
        isVerified: review.isVerified || review.verified || false,
        status: review.status || 'approved',
        helpfulCount: review.helpfulCount || 0,
        createdAt: review.createdAt || new Date().toISOString(),
      }));
      
      console.log(`Mapped ${mappedReviews.length} reviews for product ${productId}:`, mappedReviews);
      return mappedReviews;
    } catch (error) {
      console.error('Error fetching reviews:', error);
      throw error;
    }
  },

  async getReviewsByOrder(orderId: string): Promise<ReviewDTO[]> {
    const res = await fetch(`${API_BASE_URL}/api/reviews/order/${orderId}`, {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error('Không thể tải đánh giá đơn hàng');
    return res.json();
  },
};

