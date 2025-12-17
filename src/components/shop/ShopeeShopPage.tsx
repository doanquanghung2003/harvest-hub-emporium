import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Star, 
  MapPin, 
  Phone, 
  Mail, 
  Heart, 
  ShoppingCart,
  Shield,
  Truck,
  Clock,
  Users,
  Package,
  TrendingUp,
  MessageCircle,
  Share2,
  Filter,
  Grid,
  List
} from 'lucide-react';

// Mock shop data
const mockShop = {
  id: '1',
  name: 'Nông trại Xanh',
  logo: '/api/placeholder/100/100',
  banner: '/api/placeholder/800/200',
  description: 'Chuyên cung cấp rau củ quả hữu cơ tươi ngon, đảm bảo chất lượng và an toàn thực phẩm.',
  rating: 4.9,
  reviewCount: 1250,
  followers: 12500,
  following: 890,
  products: 245,
  location: 'Hà Nội',
  address: '123 Đường ABC, Quận XYZ, Hà Nội',
  phone: '0123456789',
  email: 'contact@nongtraixanh.com',
  website: 'www.nongtraixanh.com',
  establishedDate: '2020-01-15',
  isVerified: true,
  businessLicense: '123456789',
  stats: {
    totalOrders: 15420,
    totalRevenue: 2500000000,
    averageRating: 4.9,
    responseRate: 98.5,
    responseTime: '2 giờ'
  }
};

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
    discount: 25,
    isBestSeller: true,
    isFeatured: true,
    isOrganic: true,
    stock: 150
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
    discount: 17,
    isBestSeller: false,
    isFeatured: true,
    isOrganic: true,
    stock: 200
  },
  {
    id: '3',
    name: 'Cà rốt hữu cơ tươi ngon',
    image: '/api/placeholder/200/200',
    price: 35000,
    originalPrice: 40000,
    rating: 4.7,
    reviewCount: 650,
    soldCount: 1800,
    discount: 12,
    isBestSeller: false,
    isFeatured: false,
    isOrganic: true,
    stock: 120
  }
];

const mockReviews = [
  {
    id: '1',
    userName: 'Nguyễn Văn A',
    userAvatar: '/api/placeholder/40/40',
    rating: 5,
    comment: 'Sản phẩm rất tươi ngon, đóng gói cẩn thận. Sẽ ủng hộ shop lâu dài!',
    images: ['/api/placeholder/100/100', '/api/placeholder/100/100'],
    createdAt: '2024-01-15',
    isVerified: true
  },
  {
    id: '2',
    userName: 'Trần Thị B',
    userAvatar: '/api/placeholder/40/40',
    rating: 4,
    comment: 'Chất lượng tốt, giao hàng nhanh. Shop phục vụ nhiệt tình.',
    images: [],
    createdAt: '2024-01-14',
    isVerified: false
  }
];

export default function ShopeeShopPage() {
  const [activeTab, setActiveTab] = useState('products');
  const [sortBy, setSortBy] = useState('relevance');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isFollowing, setIsFollowing] = useState(false);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('vi-VN').format(num);
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
        
        <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
          <span>Đã bán: {product.soldCount}</span>
          <span>Còn: {product.stock}</span>
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
      {/* Shop Header */}
      <div className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Shop Banner */}
          <div className="relative h-48 bg-gradient-to-r from-green-400 to-blue-500 rounded-lg overflow-hidden">
            <img 
              src={mockShop.banner} 
              alt={mockShop.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/20"></div>
          </div>

          {/* Shop Info */}
          <div className="relative -mt-16 pb-6">
            <div className="flex items-start space-x-4">
              {/* Shop Logo */}
              <div className="relative">
                <img 
                  src={mockShop.logo} 
                  alt={mockShop.name}
                  className="w-24 h-24 rounded-full border-4 border-white object-cover"
                />
                {mockShop.isVerified && (
                  <Shield className="absolute -bottom-1 -right-1 h-6 w-6 text-blue-500 bg-white rounded-full" />
                )}
              </div>

              {/* Shop Details */}
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <h1 className="text-2xl font-bold">{mockShop.name}</h1>
                  {mockShop.isVerified && (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-600">
                      Đã xác thực
                    </Badge>
                  )}
                </div>
                
                <p className="text-gray-600 mb-3">{mockShop.description}</p>
                
                <div className="flex items-center space-x-6 text-sm text-gray-500 mb-4">
                  <div className="flex items-center space-x-1">
                    <Star className="h-4 w-4 text-yellow-400 fill-current" />
                    <span className="font-medium">{mockShop.rating}</span>
                    <span>({formatNumber(mockShop.reviewCount)} đánh giá)</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Users className="h-4 w-4" />
                    <span>{formatNumber(mockShop.followers)} người theo dõi</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Package className="h-4 w-4" />
                    <span>{mockShop.products} sản phẩm</span>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <Button 
                    variant={isFollowing ? "outline" : "default"}
                    onClick={() => setIsFollowing(!isFollowing)}
                  >
                    {isFollowing ? 'Đã theo dõi' : 'Theo dõi'}
                  </Button>
                  <Button variant="outline">
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Chat
                  </Button>
                  <Button variant="outline">
                    <Share2 className="h-4 w-4 mr-2" />
                    Chia sẻ
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Shop Stats */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-500">
                {formatNumber(mockShop.stats.totalOrders)}
              </div>
              <div className="text-sm text-gray-500">Đơn hàng</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500">
                {formatNumber(mockShop.stats.totalRevenue / 1000000)}M
              </div>
              <div className="text-sm text-gray-500">Doanh thu</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-500">
                {mockShop.stats.responseRate}%
              </div>
              <div className="text-sm text-gray-500">Tỷ lệ phản hồi</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-500">
                {mockShop.stats.responseTime}
              </div>
              <div className="text-sm text-gray-500">Thời gian phản hồi</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6">
          {/* Sidebar */}
          <div className="w-64 flex-shrink-0">
            <div className="bg-white rounded-lg p-4 sticky top-24">
              <h3 className="font-semibold mb-4">Thông tin shop</h3>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-sm mb-2">Liên hệ</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span>{mockShop.address}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <span>{mockShop.phone}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <span>{mockShop.email}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-sm mb-2">Thành lập</h4>
                  <p className="text-sm text-gray-600">
                    {new Date(mockShop.establishedDate).toLocaleDateString('vi-VN')}
                  </p>
                </div>

                <div>
                  <h4 className="font-medium text-sm mb-2">Giấy phép kinh doanh</h4>
                  <p className="text-sm text-gray-600">{mockShop.businessLicense}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="products">Sản phẩm</TabsTrigger>
                <TabsTrigger value="reviews">Đánh giá</TabsTrigger>
                <TabsTrigger value="about">Giới thiệu</TabsTrigger>
                <TabsTrigger value="policies">Chính sách</TabsTrigger>
              </TabsList>

              <TabsContent value="products" className="mt-6">
                {/* Products Header */}
                <div className="bg-white rounded-lg p-4 mb-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold">
                        {mockProducts.length} sản phẩm
                      </h2>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger className="w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="relevance">Liên quan nhất</SelectItem>
                          <SelectItem value="price_asc">Giá tăng dần</SelectItem>
                          <SelectItem value="price_desc">Giá giảm dần</SelectItem>
                          <SelectItem value="rating">Đánh giá cao</SelectItem>
                          <SelectItem value="sold">Bán chạy</SelectItem>
                        </SelectContent>
                      </Select>

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
                  {mockProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="reviews" className="mt-6">
                <div className="space-y-6">
                  {mockReviews.map((review) => (
                    <Card key={review.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start space-x-3">
                          <img 
                            src={review.userAvatar} 
                            alt={review.userName}
                            className="w-10 h-10 rounded-full"
                          />
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="font-medium">{review.userName}</span>
                              {review.isVerified && (
                                <Badge variant="secondary" className="bg-green-100 text-green-600 text-xs">
                                  Đã mua
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center space-x-1 mb-2">
                              {[...Array(5)].map((_, i) => (
                                <Star 
                                  key={i}
                                  className={`h-4 w-4 ${
                                    i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                                  }`}
                                />
                              ))}
                              <span className="text-sm text-gray-500 ml-2">
                                {new Date(review.createdAt).toLocaleDateString('vi-VN')}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 mb-3">{review.comment}</p>
                            {review.images.length > 0 && (
                              <div className="flex space-x-2">
                                {review.images.map((image, index) => (
                                  <img 
                                    key={index}
                                    src={image} 
                                    alt="Review image"
                                    className="w-16 h-16 rounded object-cover"
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="about" className="mt-6">
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Giới thiệu về shop</h3>
                    <p className="text-gray-700 leading-relaxed">
                      {mockShop.description}
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="policies" className="mt-6">
                <div className="space-y-4">
                  <Card>
                    <CardContent className="p-4">
                      <h3 className="font-semibold mb-2">Chính sách vận chuyển</h3>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Miễn phí vận chuyển cho đơn hàng từ 500.000đ</li>
                        <li>• Giao hàng trong vòng 1-2 ngày làm việc</li>
                        <li>• Hỗ trợ giao hàng tận nơi</li>
                      </ul>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4">
                      <h3 className="font-semibold mb-2">Chính sách đổi trả</h3>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Đổi trả trong vòng 7 ngày</li>
                        <li>• Sản phẩm phải còn nguyên vẹn</li>
                        <li>• Hoàn tiền 100% nếu sản phẩm lỗi</li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
