import { Product, ProductFormData, ProductFilters, ProductStats } from '@/types/product';

// Đọc base URL từ env để có thể gọi trực tiếp backend (ví dụ: http://localhost:8081)
const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || '';
console.log('🔧 API_BASE_URL resolved to:', API_BASE_URL || '(using Vite proxy via same origin)');

class ProductService {
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

    console.log('🖼️ getFullImageUrl input:', imagePath);
    console.log('🔧 API_BASE_URL:', API_BASE_URL);

    // Nếu đã là URL đầy đủ thì giữ nguyên
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      console.log('✅ Already full URL, returning as is');
      return imagePath;
    }

    // Nếu là đường dẫn tương đối thì thêm base URL
    if (imagePath.startsWith('/uploads/')) {
      // Nếu API_BASE_URL rỗng, sử dụng proxy của Vite (cùng origin)
      // Vite proxy sẽ chuyển /uploads/* sang http://localhost:8081/uploads/*
      if (API_BASE_URL) {
        const fullUrl = `${API_BASE_URL}${imagePath}`;
        console.log('🔗 Using API_BASE_URL, result:', fullUrl);
        return fullUrl;
      } else {
        // Sử dụng proxy, giữ nguyên đường dẫn tương đối
        console.log('🔄 Using Vite proxy, returning relative path:', imagePath);
        return imagePath;
      }
    }

    console.log('⚠️ Unknown path format, returning as is:', imagePath);
    return imagePath;
  }

  // Lấy danh sách sản phẩm
  async getProducts(filters?: ProductFilters): Promise<Product[]> {
    try {
      console.log('🔍 getProducts called with filters:', filters);

      const params = new URLSearchParams();
      // Yêu cầu trả về array trực tiếp thay vì paginated response
      params.append('asArray', 'true');
      if (filters?.search) params.append('search', filters.search);
      if (filters?.category) {
        params.append('category', filters.category);
        console.log('📋 Category filter being sent:', filters.category);
      }
      if (filters?.status) params.append('status', filters.status);
      if (filters?.minPrice) params.append('minPrice', filters.minPrice.toString());
      if (filters?.maxPrice) params.append('maxPrice', filters.maxPrice.toString());
      if (filters?.inStock !== undefined) params.append('inStock', filters.inStock.toString());

      const url = `${API_BASE_URL}/api/products?${params}`;
      console.log('🌐 Fetching products from:', url);
      console.log('🔗 API_BASE_URL:', API_BASE_URL);
      console.log('📋 Full query string:', params.toString());

      // Test backend connection first
      try {
        const testResponse = await fetch(`${API_BASE_URL}/api/products/health`);
        console.log('🧪 Backend test response:', testResponse.status);
      } catch (testError) {
        console.log('🧪 Backend test failed:', testError);
      }

      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          // Temporarily remove auth for testing
        },
      });

      console.log('📡 Response status:', response.status);
      console.log('📡 Response headers:', response.headers);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error:', errorText);
        throw new Error(`Không thể tải danh sách sản phẩm: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Products data received:', data);
      console.log('📊 Data type:', Array.isArray(data) ? 'Array' : typeof data);
      console.log('📊 Data keys:', Array.isArray(data) ? `Array[${data.length}]` : Object.keys(data || {}));

      // Xử lý cả PageResponse và array trực tiếp
      let productsArray: Product[] = [];
      if (Array.isArray(data)) {
        productsArray = data;
      } else if (data && Array.isArray(data.content)) {
        productsArray = data.content;
        console.log('📦 Extracted products from PageResponse, total:', productsArray.length);
      } else if (data && typeof data === 'object') {
        // Thử các key khác có thể chứa array
        const possibleKeys = ['products', 'items', 'data', 'results'];
        for (const key of possibleKeys) {
          if (Array.isArray(data[key])) {
            productsArray = data[key];
            console.log(`📦 Extracted products from key "${key}", total:`, productsArray.length);
            break;
          }
        }
        if (productsArray.length === 0) {
          console.warn('⚠️ Unexpected response format:', data);
        }
      } else {
        console.warn('⚠️ Unexpected response type:', typeof data);
      }
      
      console.log('✅ Final products array length:', productsArray.length);

      // Chuyển đổi đường dẫn ảnh thành URL đầy đủ
      const productsWithFullImageUrls = productsArray.map((product: Product) => ({
        ...product,
        images: product.images ? product.images.map(img => this.getFullImageUrl(img)) : []
      }));

      return productsWithFullImageUrls;
    } catch (error) {
      console.error('❌ Error fetching products:', error);
      throw error;
    }
  }

  // Lấy danh sách danh mục
  async getCategories(): Promise<any[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/categories`, {
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Không thể tải danh sách danh mục');
      }

      const data = await response.json();
      return Array.isArray(data) ? data : (data.content || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
  }

  // Tạo danh mục mới
  async createCategory(categoryData: { name: string; description: string }): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/categories`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(categoryData),
      });

      if (!response.ok) {
        throw new Error('Không thể tạo danh mục');
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating category:', error);
      throw error;
    }
  }

  // Cập nhật danh mục
  async updateCategory(id: string, categoryData: { name: string; description: string }): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/categories/${id}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(categoryData),
      });

      if (!response.ok) {
        throw new Error('Không thể cập nhật danh mục');
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating category:', error);
      throw error;
    }
  }

  // Xóa danh mục
  async deleteCategory(id: string): Promise<void> {
    console.log('🗑️ deleteCategory called with ID:', id);
    console.log('🔗 URL:', `${API_BASE_URL}/api/categories/${id}`);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/categories/${id}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      });

      console.log('📡 Response status:', response.status, response.statusText);
      console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        // Try to parse error message from response
        let errorMessage = 'Không thể xóa danh mục';
        const contentType = response.headers.get('content-type') || '';
        console.log('📄 Content-Type:', contentType);
        
        try {
          // Clone response to read it multiple times if needed
          const responseClone = response.clone();
          
          if (contentType.includes('application/json')) {
            const errorData = await response.json();
            console.log('❌ Error data (JSON):', errorData);
            
            // Handle both Map format and ApiResponse format
            if (errorData.message) {
              errorMessage = errorData.message;
            } else if (errorData.error && errorData.error.message) {
              errorMessage = errorData.error.message;
            } else if (errorData.error && typeof errorData.error === 'string') {
              errorMessage = errorData.error;
            } else if (typeof errorData === 'string') {
              errorMessage = errorData;
            } else {
              // Try to stringify the whole object
              errorMessage = JSON.stringify(errorData);
            }
          } else {
            // If response is not JSON, use status text
            const errorText = await responseClone.text();
            console.log('❌ Error text (non-JSON):', errorText);
            if (errorText) {
              errorMessage = errorText;
            } else {
              errorMessage = `Không thể xóa danh mục: ${response.status} ${response.statusText}`;
            }
          }
        } catch (parseError) {
          console.error('❌ Error parsing response:', parseError);
          // If parsing fails, try to get text
          try {
            const errorText = await response.text();
            console.log('❌ Error text (fallback):', errorText);
            if (errorText) {
              errorMessage = errorText;
            } else {
              errorMessage = `Không thể xóa danh mục: ${response.status} ${response.statusText}`;
            }
          } catch (textError) {
            console.error('❌ Error getting text:', textError);
            errorMessage = `Không thể xóa danh mục: ${response.status} ${response.statusText}`;
          }
        }
        
        console.error('❌ Final error message:', errorMessage);
        throw new Error(errorMessage);
      }
      
      // Success case
      const result = await response.json().catch(() => ({}));
      console.log('✅ Category deleted successfully:', result);
    } catch (error) {
      console.error('❌ Error deleting category:', error);
      throw error;
    }
  }

  // Lấy thông tin sản phẩm theo ID
  async getProductById(id: string): Promise<Product | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/products/${id}`, {
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        // Nếu 404, sản phẩm không tồn tại
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Không thể tải thông tin sản phẩm: ${response.status}`);
      }

      // Kiểm tra xem response có body không và có phải JSON không
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.warn(`Unexpected content type for product ${id}:`, contentType, text);
        return null;
      }

      // Kiểm tra xem response có body không
      const text = await response.text();
      if (!text || text.trim() === '') {
        console.warn(`Empty response for product ${id}`);
        return null;
      }

      let product;
      try {
        product = JSON.parse(text);
      } catch (parseError) {
        console.error(`Failed to parse JSON for product ${id}:`, parseError, text);
        return null;
      }

      // Chuyển đổi đường dẫn ảnh thành URL đầy đủ
      return {
        ...product,
        images: product.images ? product.images.map((img: string) => this.getFullImageUrl(img)) : []
      };
    } catch (error) {
      console.error('Error fetching product:', error);
      return null; // Trả về null thay vì throw để không làm gián đoạn việc load orders
    }
  }

  // Product creation method has been removed

  // Tạo sản phẩm mới
  async createProduct(productData: ProductFormData): Promise<Product> {
    try {
      console.log('Đang tạo sản phẩm với dữ liệu:', productData);
      console.log('Mảng ảnh:', productData.images);
      console.log('Mảng ảnh chi tiết:', productData.detailImages);

      // Debug chi tiết ảnh
      if (productData.images && productData.images.length > 0) {
        console.log('Chi tiết ảnh:');
        productData.images.forEach((img, index) => {
          console.log(`  Ảnh ${index}:`, {
            type: typeof img,
            isFile: img instanceof File,
            name: img instanceof File ? img.name : 'N/A',
            size: img instanceof File ? img.size : 'N/A'
          });
        });
      }

      // Kiểm tra xem có ảnh thực sự không
      const hasImages = (productData.images && productData.images.length > 0 &&
        productData.images.some(img => img instanceof File)) ||
        (productData.detailImages && productData.detailImages.length > 0 &&
          productData.detailImages.some(img => img instanceof File));

      console.log('Có ảnh thực sự:', hasImages);

      if (!hasImages) {
        // Nếu không có ảnh, sử dụng endpoint JSON
        console.log('Không có ảnh thực sự, sử dụng endpoint JSON');

        const productPayload = {
          name: productData.name,
          description: productData.description,
          shortDescription: productData.shortDescription,
          category: productData.category,
          price: productData.price,
          originalPrice: productData.originalPrice,
          stock: productData.stock,
          status: productData.status,
          tags: productData.tags,
          weight: productData.weight,
          dimensions: productData.dimensions,
          specifications: productData.specifications,
        };

        console.log('Gửi payload JSON đến API:', productPayload);
        console.log('URL API:', `${API_BASE_URL}/api/products/create-json`);

        const response = await fetch(`${API_BASE_URL}/api/products/create-json`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify(productPayload),
        });

        console.log('Trạng thái phản hồi:', response.status);
        console.log('Headers phản hồi:', response.headers);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Lỗi API:', errorText);
          throw new Error(`Không thể tạo sản phẩm: ${response.status} ${errorText}`);
        }

        const result = await response.json();
        console.log('Sản phẩm đã được tạo thành công qua JSON:', result);
        const product: Product = (result && (result as any).product) ? (result as any).product : result;
        return {
          ...product,
          images: product.images ? product.images.map((img: string) => this.getFullImageUrl(img)) : []
        } as Product;
      } else {
        // Nếu có ảnh, sử dụng FormData (multipart) với endpoint /api/products/create
        console.log('Có ảnh thực sự, sử dụng endpoint FormData /api/products/create');

        const formData = new FormData();

        // Thêm các trường text
        formData.append('name', productData.name);
        formData.append('description', productData.description);
        if (productData.shortDescription) {
          formData.append('shortDescription', productData.shortDescription);
        }
        formData.append('category', productData.category);
        formData.append('price', productData.price.toString());
        if (productData.originalPrice) {
          formData.append('originalPrice', productData.originalPrice.toString());
        }
        formData.append('stock', productData.stock.toString());
        formData.append('status', productData.status);

        // Thêm tags
        if (productData.tags && productData.tags.length > 0) {
          formData.append('tags', JSON.stringify(productData.tags));
        }

        // Thêm weight
        if (productData.weight) {
          formData.append('weight', productData.weight.toString());
        }

        // Thêm dimensions
        if (productData.dimensions) {
          formData.append('dimensions', JSON.stringify(productData.dimensions));
        }

        // Thêm specifications
        if (productData.specifications) {
          formData.append('specifications', JSON.stringify(productData.specifications));
        }

        // Giới hạn tổng số ảnh (images + detailImages) <= 5
        const MAX_IMAGES = 5;
        const imageFiles = (productData.images || []).filter((f): f is File => f instanceof File);
        const detailImageFiles = (productData.detailImages || []).filter((f): f is File => f instanceof File);

        const allowedMain = imageFiles.slice(0, Math.min(imageFiles.length, MAX_IMAGES));
        const remaining = MAX_IMAGES - allowedMain.length;
        const allowedDetail = remaining > 0 ? detailImageFiles.slice(0, remaining) : [];

        if (imageFiles.length + detailImageFiles.length > MAX_IMAGES) {
          console.warn(`⚠️ Tổng số ảnh vượt quá ${MAX_IMAGES}. Sẽ chỉ gửi ${allowedMain.length + allowedDetail.length} ảnh (ưu tiên ảnh chính).`);
        }

        // Thêm tất cả ảnh vào trường 'images' (backend /create chấp nhận 'images' và 'detailImages')
        allowedMain.forEach((image, index) => {
          formData.append('images', image);
          console.log(`Đã thêm ảnh images[${index}]:`, image.name, image.size);
        });
        const allDetailImages = [...allowedDetail];
        allDetailImages.forEach((image, index) => {
          formData.append('detailImages', image);
          console.log(`Đã thêm ảnh detailImages[${index}]:`, image.name, image.size);
        });

        // Debug nội dung FormData
        console.log('Các mục FormData:');
        for (let [key, value] of formData.entries()) {
          console.log(`${key}:`, value);
        }

        console.log('Gửi FormData đến API:', formData);
        console.log('URL API:', `${API_BASE_URL}/api/products/create`);

        const response = await fetch(`${API_BASE_URL}/api/products/create`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: formData, // Không cần set Content-Type, browser sẽ tự set
        });

        console.log('Trạng thái phản hồi:', response.status);
        console.log('Headers phản hồi:', response.headers);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Lỗi API:', errorText);
          throw new Error(`Không thể tạo sản phẩm: ${response.status} ${errorText}`);
        }

        const result = await response.json();
        console.log('Sản phẩm đã được tạo thành công qua multipart /create:', result);
        const product: Product = (result && (result as any).product) ? (result as any).product : result;
        return {
          ...product,
          images: product.images ? product.images.map((img: string) => this.getFullImageUrl(img)) : []
        } as Product;
      }
    } catch (error) {
      console.error('Lỗi khi tạo sản phẩm:', error);
      throw error;
    }
  }

  // Cập nhật sản phẩm
  async updateProduct(id: string, productData: Partial<ProductFormData>): Promise<Product> {
    try {
      console.log('🛠 updateProduct called', { id, productDataKeys: Object.keys(productData || {}) });

      // Kiểm tra xem có ảnh mới không
      const hasNewImages = (productData.images && productData.images.length > 0 && productData.images[0] instanceof File) ||
        (productData.detailImages && productData.detailImages.length > 0 && productData.detailImages[0] instanceof File);

      if (hasNewImages) {
        // Nếu có ảnh mới, sử dụng endpoint update-images
        console.log('📸 Has new images, using update-images endpoint');
        return await this.updateProductImages(id, productData);
      } else {
        // Nếu không có ảnh, sử dụng endpoint JSON thông thường
        console.log('📝 No new images, using JSON update endpoint');
        return await this.updateProductJson(id, productData);
      }
    } catch (error) {
      console.error('❌ Error updating product (client):', error);
      throw error;
    }
  }

  // Update sản phẩm với ảnh mới
  private async updateProductImages(id: string, productData: Partial<ProductFormData>): Promise<Product> {
    try {
      const formData = new FormData();

      // Giới hạn tổng số ảnh (images + detailImages) <= 5
      const MAX_IMAGES = 5;
      const imageFiles = (productData.images || []).filter((f): f is File => f instanceof File);
      const detailImageFiles = (productData.detailImages || []).filter((f): f is File => f instanceof File);
      const allowedMain = imageFiles.slice(0, Math.min(imageFiles.length, MAX_IMAGES));
      const remaining = MAX_IMAGES - allowedMain.length;
      const allowedDetail = remaining > 0 ? detailImageFiles.slice(0, remaining) : [];
      if (imageFiles.length + detailImageFiles.length > MAX_IMAGES) {
        console.warn(`⚠️ Tổng số ảnh vượt quá ${MAX_IMAGES}. Sẽ chỉ gửi ${allowedMain.length + allowedDetail.length} ảnh (ưu tiên ảnh chính).`);
      }

      // Thêm ảnh mới đã giới hạn
      allowedMain.forEach((image) => {
        formData.append('images', image);
        console.log('append images:', image.name, image.size);
      });
      allowedDetail.forEach((image) => {
        formData.append('detailImages', image);
        console.log('append detailImages:', image.name, image.size);
      });

      console.log('📦 FormData preview before send:');
      for (const [k, v] of formData.entries()) {
        console.log('  -', k, v);
      }

      const url = `${API_BASE_URL}/api/products/${id}/update-images`;
      console.log('🚀 Sending POST to update-images:', url);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: formData,
      });

      const contentType = response.headers.get('content-type') || '';
      const rawBody = await response.text();
      console.log('📥 Response status:', response.status, response.statusText);
      console.log('📥 Response content-type:', contentType);
      console.log('📥 Response body (raw):', rawBody);

      if (!response.ok) {
        throw new Error(`Update failed: ${response.status} ${response.statusText} | Body: ${rawBody}`);
      }

      try {
        const data: Product = contentType.includes('application/json') ? JSON.parse(rawBody) : JSON.parse(rawBody);
        console.log('✅ Update images success parsed JSON:', data);

        // Chuyển đổi đường dẫn ảnh thành URL đầy đủ
        return {
          ...data,
          images: data.images ? data.images.map((img: string) => this.getFullImageUrl(img)) : []
        };
      } catch (e) {
        console.error('⚠️ Cannot parse JSON from response body');
        throw new Error(`Update succeeded but response is not JSON. Body: ${rawBody}`);
      }
    } catch (error) {
      console.error('❌ Error updating product images:', error);
      throw error;
    }
  }

  // Update sản phẩm không có ảnh (JSON)
  private async updateProductJson(id: string, productData: Partial<ProductFormData>): Promise<Product> {
    try {
      const updatePayload: any = {};

      // Chỉ thêm các trường có giá trị
      if (productData.name) updatePayload.name = productData.name;
      if (productData.description) updatePayload.description = productData.description;
      if (productData.shortDescription) updatePayload.shortDescription = productData.shortDescription;
      if (productData.category) updatePayload.category = productData.category;
      if (productData.price) updatePayload.price = productData.price;
      if (productData.originalPrice) updatePayload.originalPrice = productData.originalPrice;
      if (productData.stock !== undefined) updatePayload.stock = productData.stock;
      if (productData.status) updatePayload.status = productData.status;
      if (productData.tags) updatePayload.tags = productData.tags;
      // Thông tin kỹ thuật - gửi tất cả các trường (kể cả rỗng) để lưu vào DB
      if (productData.weight !== undefined && productData.weight !== null) updatePayload.weight = productData.weight;
      if (productData.origin !== undefined && productData.origin !== null) updatePayload.origin = productData.origin;
      if (productData.expiryDate !== undefined && productData.expiryDate !== null) updatePayload.expiryDate = productData.expiryDate;
      // Backend dùng storageInstructions thay vì storage
      if (productData.storage !== undefined && productData.storage !== null) updatePayload.storageInstructions = productData.storage;
      if (productData.storageInstructions !== undefined && productData.storageInstructions !== null) updatePayload.storageInstructions = productData.storageInstructions;
      if (productData.unit !== undefined && productData.unit !== null) updatePayload.unit = productData.unit;
      
      // dimensions, ingredients, brand không có trong Product model - lưu vào specifications
      // Tạo hoặc merge specifications object
      const specs: any = productData.specifications ? { ...productData.specifications } : {};
      if (productData.dimensions !== undefined && productData.dimensions !== null && productData.dimensions !== '') {
        specs['Kích thước'] = productData.dimensions;
      }
      if (productData.ingredients !== undefined && productData.ingredients !== null && productData.ingredients !== '') {
        specs['Thành phần'] = productData.ingredients;
      }
      if (productData.brand !== undefined && productData.brand !== null && productData.brand !== '') {
        specs['Thương hiệu'] = productData.brand;
      }
      if (Object.keys(specs).length > 0) {
        updatePayload.specifications = specs;
      }

      console.log('📝 JSON update payload:', updatePayload);

      const url = `${API_BASE_URL}/api/products/${id}/json`;
      console.log('🚀 Sending PUT to JSON endpoint:', url);

      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(updatePayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Không thể cập nhật sản phẩm');
      }

      const result = await response.json();
      console.log('✅ JSON update success:', result);
      return result;
    } catch (error) {
      console.error('❌ Error updating product JSON:', error);
      throw error;
    }
  }

  // Xóa sản phẩm
  async deleteProduct(id: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/products/${id}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Không thể xóa sản phẩm');
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  }

  // Cập nhật trạng thái sản phẩm
  async updateProductStatus(id: string, status: Product['status']): Promise<Product> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/products/${id}/status`, {
        method: 'PATCH',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Không thể cập nhật trạng thái sản phẩm');
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating product status:', error);
      throw error;
    }
  }

  // Lấy thống kê sản phẩm
  async getProductStats(): Promise<ProductStats> {
    try {
      // Chuẩn hóa: tính toán từ danh sách sản phẩm để tránh lệch schema backend
      const products = await this.getProducts();
      // Đảm bảo products là array
      const productsArray = Array.isArray(products) ? products : [];
      const total = productsArray.length;
      const active = productsArray.filter(p => p.status === 'active').length;
      const inactive = productsArray.filter(p => p.status === 'inactive').length;
      const outOfStock = productsArray.filter(p => (p.stock ?? 0) === 0).length;
      const pending = productsArray.filter(p => p.status === 'pending').length;
      const lowStock = productsArray.filter(p => (p.stock ?? 0) > 0 && (p.stock ?? 0) <= 10).length;

      return { total, active, inactive, outOfStock, pending, lowStock } as ProductStats;
    } catch (error) {
      console.error('Error fetching product stats:', error);
      throw error;
    }
  }

  // Upload ảnh
  async uploadImage(file: File): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch(`${API_BASE_URL}/api/upload/image`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Không thể tải lên ảnh');
      }

      const data = await response.json();
      return data.imageUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  }
}

export const productService = new ProductService();
