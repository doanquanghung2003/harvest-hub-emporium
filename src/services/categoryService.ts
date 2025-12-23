export interface Category {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  image?: string;
  color?: string;
  slug?: string;
  parentId?: string;
  subcategoryIds?: string[];
  level?: number;
  isActive?: boolean;
  isFeatured?: boolean;
  sortOrder?: number;
  productCount?: number;
  createdAt?: string;
  updatedAt?: string;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
}

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || "";
const API_PREFIX = API_BASE_URL ? `${API_BASE_URL}/api` : "/api";

class CategoryService {
  // Lấy tất cả danh mục
  async getAllCategories(): Promise<Category[]> {
    try {
      const response = await fetch(`${API_PREFIX}/categories`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Không thể tải danh sách danh mục: ${response.status}`);
      }

      const categories = await response.json();
      return Array.isArray(categories) ? categories : [];
    } catch (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
  }

  // Lấy danh mục đang hoạt động
  async getActiveCategories(): Promise<Category[]> {
    try {
      const response = await fetch(`${API_PREFIX}/categories/active`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Không thể tải danh sách danh mục đang hoạt động: ${response.status}`);
      }

      const categories = await response.json();
      return Array.isArray(categories) ? categories : [];
    } catch (error) {
      console.error('Error fetching active categories:', error);
      return [];
    }
  }

  // Lấy danh mục theo ID
  async getCategoryById(id: string): Promise<Category | null> {
    try {
      const response = await fetch(`${API_PREFIX}/categories/${id}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Không thể tải thông tin danh mục: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching category:', error);
      return null;
    }
  }

  // Lấy danh mục nổi bật (featured)
  async getFeaturedCategories(): Promise<Category[]> {
    try {
      const categories = await this.getActiveCategories();
      return categories.filter(cat => cat.isFeatured === true);
    } catch (error) {
      console.error('Error fetching featured categories:', error);
      return [];
    }
  }
}

export const categoryService = new CategoryService();

