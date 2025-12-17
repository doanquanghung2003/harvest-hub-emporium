import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  ShoppingCart, 
  Heart, 
  Star, 
  Truck, 
  Shield, 
  Clock,
  Fire,
  TrendingUp,
  Gift,
  Tag,
  MapPin,
  Phone,
  Mail
} from 'lucide-react';

// Mock data - sẽ thay thế bằng API calls
const mockBanners = [
  {
    id: '1',
    title: 'Flash Sale 50%',
    image: '/api/placeholder/800/300',
    link: '/flash-sale',
    position: 'homepage_top'
  },
  {
    id: '2', 
    title: 'Mùa hè sôi động',
    image: '/api/placeholder/800/300',
    link: '/summer-sale',
    position: 'homepage_top'
  }
];

const mockCategories = [
  { id: '1', name: 'Rau củ quả', icon: '🥬', color: 'bg-green-100' },
  { id: '2', name: 'Trái cây', icon: '🍎', color: 'bg-red-100' },
  { id: '3', name: 'Thịt cá', icon: '🥩', color: 'bg-orange-100' },
  { id: '4', name: 'Gia vị', icon: '🧄', color: 'bg-yellow-100' },
  { id: '5', name: 'Đồ khô', icon: '🥜', color: 'bg-amber-100' },
  { id: '6', name: 'Đồ uống', icon: '🥤', color: 'bg-blue-100' },
  { id: '7', name: 'Bánh kẹo', icon: '🍪', color: 'bg-pink-100' },
  { id: '8', name: 'Khác', icon: '🛒', color: 'bg-gray-100' }
];

const mockFlashSales = [
  {
    id: '1',
    name: 'Flash Sale 12h',
    endTime: new Date(Date.now() + 12 * 60 * 60 * 1000),
    products: [
      {
        id: '1',
        name: 'Cà chua hữu cơ',
        image: '/api/placeholder/200/200',
        originalPrice: 50000,
        flashSalePrice: 25000,
        soldCount: 45,
        stock: 100
      },
      {
        id: '2', 
        name: 'Rau muống sạch',
        image: '/api/placeholder/200/200',
        originalPrice: 30000,
        flashSalePrice: 15000,
        soldCount: 78,
        stock: 100
      }
    ]
  }
];

const mockProducts = [
  {
    id: '1',
    name: 'Cà chua hữu cơ tươi ngon',
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
    isFeatured: true
  },
  {
    id: '2',
    name: 'Rau muống sạch không thuốc',
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
    isFeatured: true
  }
];

const mockShops = [
  {
    id: '1',
    name: 'Nông trại Xanh',
    logo: '/api/placeholder/80/80',
    rating: 4.9,
    followers: 12500,
    products: 245,
    location: 'Hà Nội',
    isVerified: true
  },
  {
    id: '2',
    name: 'Vườn rau sạch',
    logo: '/api/placeholder/80/80',
    rating: 4.7,
    followers: 8900,
    products: 180,
    location: 'TP.HCM',
    isVerified: true
  }
];

export default function ShopeeHomePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Implement search logic
    console.log('Searching for:', searchQuery);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  };

  const formatTimeRemaining = (endTime: Date) => {
    const now = new Date();
    const diff = endTime.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

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
              <Button size="sm" className="bg-orange-500 hover:bg-orange-600">
                Đăng nhập
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Banner Carousel */}
        <div className="mb-8">
          <div className="relative bg-gradient-to-r from-orange-400 to-red-500 rounded-lg overflow-hidden">
            <div className="p-8 text-white">
              <h2 className="text-3xl font-bold mb-2">Flash Sale 50%</h2>
              <p className="text-lg mb-4">Khuyến mãi lớn nhất năm - Chỉ trong 12 giờ!</p>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Clock className="h-5 w-5" />
                  <span className="font-semibold">Còn lại: {formatTimeRemaining(mockFlashSales[0].endTime)}</span>
                </div>
                <Button className="bg-white text-orange-500 hover:bg-gray-100">
                  Mua ngay
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4">Danh mục sản phẩm</h3>
          <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-4">
            {mockCategories.map((category) => (
              <div key={category.id} className="text-center cursor-pointer hover:scale-105 transition-transform">
                <div className={`w-16 h-16 rounded-full ${category.color} flex items-center justify-center text-2xl mb-2 mx-auto`}>
                  {category.icon}
                </div>
                <span className="text-sm font-medium text-gray-700">{category.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Flash Sale Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Fire className="h-6 w-6 text-red-500" />
              <h3 className="text-xl font-semibold">Flash Sale</h3>
              <Badge variant="destructive">Hot</Badge>
            </div>
            <Button variant="outline" size="sm">Xem tất cả</Button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {mockFlashSales[0].products.map((product) => (
              <Card key={product.id} className="relative overflow-hidden hover:shadow-lg transition-shadow">
                <div className="relative">
                  <img 
                    src={product.image} 
                    alt={product.name}
                    className="w-full h-48 object-cover"
                  />
                  <Badge className="absolute top-2 left-2 bg-red-500">
                    -{Math.round((1 - product.flashSalePrice / product.originalPrice) * 100)}%
                  </Badge>
                </div>
                <CardContent className="p-4">
                  <h4 className="font-semibold text-sm mb-2 line-clamp-2">{product.name}</h4>
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-lg font-bold text-red-500">
                      {formatPrice(product.flashSalePrice)}
                    </span>
                    <span className="text-sm text-gray-500 line-through">
                      {formatPrice(product.originalPrice)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Đã bán: {product.soldCount}</span>
                    <span>Còn: {product.stock - product.soldCount}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div 
                      className="bg-red-500 h-2 rounded-full" 
                      style={{ width: `${(product.soldCount / product.stock) * 100}%` }}
                    ></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Featured Products */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-6 w-6 text-blue-500" />
              <h3 className="text-xl font-semibold">Sản phẩm nổi bật</h3>
            </div>
            <Button variant="outline" size="sm">Xem tất cả</Button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {mockProducts.map((product) => (
              <Card key={product.id} className="hover:shadow-lg transition-shadow cursor-pointer">
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
                  <div className="flex items-center space-x-1 text-xs text-gray-600">
                    <MapPin className="h-3 w-3" />
                    <span>{product.shopName}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Featured Shops */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Gift className="h-6 w-6 text-green-500" />
              <h3 className="text-xl font-semibold">Shop nổi bật</h3>
            </div>
            <Button variant="outline" size="sm">Xem tất cả</Button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {mockShops.map((shop) => (
              <Card key={shop.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3 mb-3">
                    <img 
                      src={shop.logo} 
                      alt={shop.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div className="flex-1">
                      <div className="flex items-center space-x-1">
                        <h4 className="font-semibold text-sm">{shop.name}</h4>
                        {shop.isVerified && (
                          <Shield className="h-4 w-4 text-blue-500" />
                        )}
                      </div>
                      <div className="flex items-center space-x-1 text-xs text-gray-500">
                        <Star className="h-3 w-3 text-yellow-400 fill-current" />
                        <span>{shop.rating}</span>
                        <span>•</span>
                        <span>{shop.followers.toLocaleString()} người theo dõi</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-600 mb-3">
                    <span>{shop.products} sản phẩm</span>
                    <span className="flex items-center space-x-1">
                      <MapPin className="h-3 w-3" />
                      <span>{shop.location}</span>
                    </span>
                  </div>
                  <Button size="sm" className="w-full">
                    Xem shop
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Trust Badges */}
        <div className="bg-white rounded-lg p-6 mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="text-center">
              <Truck className="h-8 w-8 text-blue-500 mx-auto mb-2" />
              <h4 className="font-semibold text-sm mb-1">Giao hàng nhanh</h4>
              <p className="text-xs text-gray-600">Giao hàng trong 24h</p>
            </div>
            <div className="text-center">
              <Shield className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <h4 className="font-semibold text-sm mb-1">Đảm bảo chất lượng</h4>
              <p className="text-xs text-gray-600">Sản phẩm tươi ngon</p>
            </div>
            <div className="text-center">
              <Phone className="h-8 w-8 text-orange-500 mx-auto mb-2" />
              <h4 className="font-semibold text-sm mb-1">Hỗ trợ 24/7</h4>
              <p className="text-xs text-gray-600">Hotline: 1900-xxxx</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
