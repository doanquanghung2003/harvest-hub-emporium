export interface Product {
  id: string;
  name: string;
  description: string;
  shortDescription?: string;
  category: string;
  price: number;
  originalPrice?: number;
  stock: number;
  images: string[];
  detailImages?: string[];
  tags: string[];
  status: 'active' | 'inactive' | 'out_of_stock' | 'pending';
  sellerId?: string;
  sellerName?: string;
  rating: number;
  reviewCount: number;
  soldCount: number;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  specifications?: Record<string, any>;
  origin?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductFormData {
  name: string;
  description: string;
  shortDescription?: string;
  category: string;
  price: number;
  originalPrice?: number;
  stock: number;
  images: File[];
  detailImages?: File[];
  tags: string[];
  status: 'active' | 'inactive' | 'out_of_stock' | 'pending';
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  specifications?: Record<string, any>;
}

export interface ProductFilters {
  search?: string;
  category?: string;
  status?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
}

export interface ProductStats {
  total: number;
  active: number;
  inactive: number;
  outOfStock: number;
  pending: number;
  lowStock: number;
}
