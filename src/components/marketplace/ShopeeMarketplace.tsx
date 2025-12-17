import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { 
  Search, 
  Filter, 
  Star, 
  MapPin, 
  Truck, 
  Shield,
  Heart,
  ShoppingCart,
  ChevronDown,
  Grid,
  List,
  SlidersHorizontal
} from 'lucide-react';

// Mock data
const mockCategories = [
  { id: 'all', name: 'Tất cả', count: 1250 },
  { id: 'vegetables', name: 'Rau củ quả', count: 320 },
  { id: 'fruits', name: 'Trái cây', count: 180 },
  { id: 'meat', name: 'Thịt cá', count: 95 },
  { id: 'spices', name: 'Gia vị', count: 150 },
  { id: 'dry', name: 'Đồ khô', count: 200 },
  { id: 'beverages', name: 'Đồ uống', count: 120 },
  { id: 'sweets', name: 'Bánh kẹo', count: 85 }
];

const mockProducts = [
  {
    id: '1',
    name: 'Cà chua hữu cơ tươi ngon từ Đà Lạt',
    image: '/api/placeholder/200/200',
    price: 45000,
    originalPrice: 60000,
    rating: 4.8,
    reviewCount: 1250,
    soldCount: 3200,
    shopName: 'Nông trại Xanh',
    shopLocation: 'Hà Nội',
    discount: 25,
    isBestSeller: true,
    isFeatured: true,
    isOrganic: true,
    shippingCost: 15000,
    estimatedDelivery: '1-2 ngày'
  },
  {
    id: '2',
    name: 'Rau muống sạch không thuốc trừ sâu',
    image: '/api/placeholder/200/200',
    price: 25000,
    originalPrice: 30000,
    rating: 4.6,
    reviewCount: 890,
    soldCount: 2100,
    shopName: 'Vườn rau sạch',
    shopLocation: 'TP.HCM',
    discount: 17,
    isBestSeller: false,
    isFeatured: true,
    isOrganic: true,
    shippingCost: 12000,
    estimatedDelivery: '2-3 ngày'
  },
  {
    id: '3',
    name: 'Táo đỏ Mỹ nhập khẩu cao cấp',
    image: '/api/placeholder/200/200',
    price: 120000,
    originalPrice: 150000,
    rating: 4.9,
    reviewCount: 450,
    soldCount: 890,
    shopName: 'Fruit Paradise',
    shopLocation: 'Đà Nẵng',
    discount: 20,
    isBestSeller: true,
    isFeatured: false,
    isOrganic: false,
    shippingCost: 20000,
    estimatedDelivery: '3-5 ngày'
  },
  {
    id: '4',
    name: 'Cá hồi tươi ngon từ Na Uy',
    image: '/api/placeholder/200/200',
    price: 350000,
    originalPrice: 400000,
    rating: 4.7,
    reviewCount: 320,
    soldCount: 156,
    shopName: 'Seafood King',
    shopLocation: 'Hải Phòng',
    discount: 12,
    isBestSeller: false,
    isFeatured: false,
    isOrganic: false,
    shippingCost: 30000,
    estimatedDelivery: '1 ngày'
  }
];

const sortOptions = [
  { value: 'relevance', label: 'Liên quan nhất' },
  { value: 'price_asc', label: 'Giá tăng dần' },
  { value: 'price_desc', label: 'Giá giảm dần' },
  { value: 'rating', label: 'Đánh giá cao' },
  { value: 'sold', label: 'Bán chạy' },
  { value: 'newest', label: 'Mới nhất' }
];

export default function ShopeeMarketplace() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [priceRange, setPriceRange] = useState([0, 1000000]);
  const [sortBy, setSortBy] = useState('relevance');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [filteredProducts, setFilteredProducts] = useState(mockProducts);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters();
  };

  const applyFilters = () => {
    let filtered = [...mockProducts];

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.shopName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      // Mock category filtering - in real app, this would be based on product categories
      filtered = filtered.filter(product => {
        switch (selectedCategory) {
          case 'vegetables':
            return product.name.toLowerCase().includes('rau') || product.name.toLowerCase().includes('cà');
          case 'fruits':
            return product.name.toLowerCase().includes('táo') || product.name.toLowerCase().includes('trái');
          case 'meat':
            return product.name.toLowerCase().includes('cá') || product.name.toLowerCase().includes('thịt');
          default:
            return true;
        }
      });
    }

    // Filter by price range
    filtered = filtered.filter(product => 
      product.price >= priceRange[0] && product.price <= priceRange[1]
    );

    // Sort products
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'price_asc':
          return a.price - b.price;
        case 'price_desc':
          return b.price - a.price;
        case 'rating':
          return b.rating - a.rating;
        case 'sold':
          return b.soldCount - a.soldCount;
        case 'newest':
          return b.id.localeCompare(a.id);
        default:
          return 0;
      }
    });

    setFilteredProducts(filtered);
  };

  useEffect(() => {
    applyFilters();
  }, [selectedCategory, priceRange, sortBy]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  };

  const ProductCard = ({ product }: { product: typeof mockProducts[0] }) => (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer">
      <div className="relative">
        <img 
          src={product.image} 
          alt={product.name}
          className="w-full h-48 object-cover rounded-t-lg"
        />
        {product.discount > 0 && (
          <Badge className="absolute top-2 left-2 bg-red-500">
            -{product.discount}%
          </Badge>
        )}
        {product.isBestSeller && (
          <Badge className="absolute top-2 right-2 bg-yellow-500">
            Bán chạy
          </Badge>
        )}
        {product.isOrganic && (
          <Badge className="absolute bottom-2 left-2 bg-green-500">
            Hữu cơ
          </Badge>
        )}
        <Button 
          size="sm" 
          variant="ghost" 
          className="absolute top-2 right-2 bg-white/80 hover:bg-white"
        >
          <Heart className="h-4 w-4" />
        </Button>
      </div>
      <CardContent className="p-4">
        <h4 className="font-semibold text-sm mb-2 line-clamp-2">{product.name}</h4>
        
        <div className="flex items-center space-x-1 mb-2">
          <Star className="h-4 w-4 text-yellow-400 fill-current" />
          <span className="text-sm font-medium">{product.rating}</span>
          <span className="text-xs text-gray-500">({product.reviewCount})</span>
        </div>
        
        <div className="flex items-center space-x-2 mb-2">
          <span className="text-lg font-bold text-orange-500">
            {formatPrice(product.price)}
          </span>
          {product.originalPrice > product.price && (
            <span className="text-sm text-gray-500 line-through">
              {formatPrice(product.originalPrice)}
            </span>
          )}
        </div>
        
        <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
          <span>Đã bán: {product.soldCount}</span>
          <span>{product.shopLocation}</span>
        </div>
        
        <div className="flex items-center space-x-1 text-xs text-gray-600 mb-3">
          <MapPin className="h-3 w-3" />
          <span>{product.shopName}</span>
        </div>
        
        <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
          <div className="flex items-center space-x-1">
            <Truck className="h-3 w-3" />
            <span>{product.estimatedDelivery}</span>
          </div>
          <span>Ship: {formatPrice(product.shippingCost)}</span>
        </div>
        
        <Button size="sm" className="w-full">
          <ShoppingCart className="h-4 w-4 mr-2" />
          Thêm vào giỏ
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-orange-500">HarvestHub</h1>
            </div>

            {/* Search Bar */}
            <div className="flex-1 max-w-2xl mx-8">
              <form onSubmit={handleSearch} className="relative">
                <Input
                  type="text"
                  placeholder="Tìm kiếm sản phẩm, shop..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              </form>
            </div>

            {/* Right Actions */}
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm">
                <Heart className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="sm">
                <ShoppingCart className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6">
          {/* Sidebar Filters */}
          <div className="w-64 flex-shrink-0">
            <div className="bg-white rounded-lg p-4 sticky top-24">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Bộ lọc</h3>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className="lg:hidden"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                </Button>
              </div>
              
              <div className={`space-y-6 ${showFilters ? 'block' : 'hidden lg:block'}`}>
                {/* Categories */}
                <div>
                  <h4 className="font-medium mb-3">Danh mục</h4>
                  <div className="space-y-2">
                    {mockCategories.map((category) => (
                      <div 
                        key={category.id}
                        className={`flex items-center justify-between p-2 rounded cursor-pointer hover:bg-gray-50 ${
                          selectedCategory === category.id ? 'bg-orange-50 text-orange-600' : ''
                        }`}
                        onClick={() => setSelectedCategory(category.id)}
                      >
                        <span className="text-sm">{category.name}</span>
                        <span className="text-xs text-gray-500">({category.count})</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Price Range */}
                <div>
                  <h4 className="font-medium mb-3">Khoảng giá</h4>
                  <div className="space-y-3">
                    <Slider
                      value={priceRange}
                      onValueChange={setPriceRange}
                      max={1000000}
                      step={10000}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{formatPrice(priceRange[0])}</span>
                      <span>{formatPrice(priceRange[1])}</span>
                    </div>
                  </div>
                </div>

                {/* Additional Filters */}
                <div>
                  <h4 className="font-medium mb-3">Khác</h4>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" className="rounded" />
                      <span className="text-sm">Miễn phí vận chuyển</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" className="rounded" />
                      <span className="text-sm">Sản phẩm hữu cơ</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" className="rounded" />
                      <span className="text-sm">Có đánh giá</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {/* Results Header */}
            <div className="bg-white rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">
                    {filteredProducts.length} sản phẩm
                  </h2>
                  <p className="text-sm text-gray-500">
                    {selectedCategory !== 'all' && `trong danh mục ${mockCategories.find(c => c.id === selectedCategory)?.name}`}
                  </p>
                </div>
                
                <div className="flex items-center space-x-4">
                  {/* Sort */}
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {sortOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* View Mode */}
                  <div className="flex border rounded-lg">
                    <Button
                      variant={viewMode === 'grid' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('grid')}
                    >
                      <Grid className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={viewMode === 'list' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('list')}
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Products Grid */}
            <div className={`grid gap-4 ${
              viewMode === 'grid' 
                ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
                : 'grid-cols-1'
            }`}>
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {/* Load More */}
            {filteredProducts.length > 0 && (
              <div className="text-center mt-8">
                <Button variant="outline" size="lg">
                  Xem thêm sản phẩm
                </Button>
              </div>
            )}

            {/* No Results */}
            {filteredProducts.length === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <Search className="h-12 w-12 mx-auto" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Không tìm thấy sản phẩm</h3>
                <p className="text-gray-500 mb-4">
                  Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc
                </p>
                <Button onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                  setPriceRange([0, 1000000]);
                }}>
                  Xóa bộ lọc
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
