import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Clock, 
  Zap, 
  ShoppingCart, 
  Heart, 
  Star, 
  Truck,
  Shield,
  TrendingUp,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { flashSaleService, FlashSale, FlashSaleProduct } from '@/services/flashSaleService';
import { cartService } from '@/services/cartService';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export default function FlashSalePage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [timeRemaining, setTimeRemaining] = useState('');
  const [flashSale, setFlashSale] = useState<FlashSale | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load flash sale data
  const loadFlashSale = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Try to get active flash sales first
      const activeFlashSales = await flashSaleService.getActiveFlashSales();
      
      if (activeFlashSales && activeFlashSales.length > 0) {
        setFlashSale(activeFlashSales[0]);
      } else {
        // If no active, try upcoming
        const upcomingFlashSales = await flashSaleService.getUpcomingFlashSales();
        if (upcomingFlashSales && upcomingFlashSales.length > 0) {
          setFlashSale(upcomingFlashSales[0]);
        } else {
          // If no upcoming, get the most recent one
          const allFlashSales = await flashSaleService.getAllFlashSales();
          if (allFlashSales && allFlashSales.length > 0) {
            setFlashSale(allFlashSales[0]);
          } else {
            setError('Hiện tại không có flash sale nào');
          }
        }
      }
    } catch (err) {
      console.error('Error loading flash sale:', err);
      setError('Không thể tải thông tin flash sale');
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadFlashSale();
  }, []);

  // Reload when page becomes visible (user comes back to tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadFlashSale();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Update timer
  useEffect(() => {
    if (!flashSale) return;

    const updateTimer = async () => {
      try {
        const remainingSeconds = await flashSaleService.getRemainingTime(flashSale.id);
        
        if (remainingSeconds <= 0) {
          setTimeRemaining('00:00:00');
          return;
        }
        
        const hours = Math.floor(remainingSeconds / 3600);
        const minutes = Math.floor((remainingSeconds % 3600) / 60);
        const seconds = remainingSeconds % 60;
        
        setTimeRemaining(
          `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        );
      } catch (err) {
        // Fallback to calculating from endTime
        const now = new Date();
        const endTime = new Date(flashSale.endTime);
        const diff = endTime.getTime() - now.getTime();
        
        if (diff <= 0) {
          setTimeRemaining('00:00:00');
          return;
        }
        
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        setTimeRemaining(
          `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        );
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [flashSale]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  };

  const getDiscountPercentage = (originalPrice: number, flashSalePrice: number) => {
    return Math.round((1 - flashSalePrice / originalPrice) * 100);
  };

  const getProgressPercentage = (soldCount: number, stock: number) => {
    if (stock === 0) return 0;
    return Math.min((soldCount / stock) * 100, 100);
  };

  const handleAddToCart = async (product: FlashSaleProduct) => {
    if (!isAuthenticated || !user) {
      toast({
        title: 'Cần đăng nhập',
        description: 'Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng',
        variant: 'destructive',
      });
      navigate('/auth');
      return;
    }

    try {
      await cartService.addToCart(user.id, product.productId, 1);
      toast({
        title: 'Thành công',
        description: 'Đã thêm sản phẩm vào giỏ hàng',
      });
      window.dispatchEvent(new Event('cart:updated'));
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể thêm sản phẩm vào giỏ hàng',
        variant: 'destructive',
      });
    }
  };

  const handleBuyNow = (product: FlashSaleProduct) => {
    if (!isAuthenticated || !user) {
      toast({
        title: 'Cần đăng nhập',
        description: 'Vui lòng đăng nhập để mua hàng',
        variant: 'destructive',
      });
      navigate('/auth');
      return;
    }
    navigate(`/product/${product.productId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Đang tải flash sale...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !flashSale) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 mx-auto mb-4 text-red-500" />
            <p className="text-gray-600">{error || 'Không tìm thấy flash sale'}</p>
            <Button onClick={() => navigate('/')} className="mt-4">
              Về trang chủ
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const FlashSaleProductCard = ({ product }: { product: FlashSaleProduct }) => (
    <Card className="relative overflow-hidden hover:shadow-lg transition-shadow">
      <div 
        className="relative cursor-pointer"
        onClick={() => navigate(`/product/${product.productId}`)}
      >
        <img 
          src={product.productImage || '/placeholder.svg'} 
          alt={product.productName}
          className="w-full h-48 object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/placeholder.svg';
          }}
        />
        <Badge className="absolute top-2 left-2 bg-red-500">
          -{Math.round(product.discountPercentage || 0)}%
        </Badge>
        <Button 
          size="sm" 
          variant="ghost" 
          className="absolute top-2 right-2 bg-white/80 hover:bg-white"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/product/${product.productId}`);
          }}
        >
          <Heart className="h-4 w-4" />
        </Button>
      </div>
      
      <CardContent className="p-4">
        <h4 
          className="font-semibold text-sm mb-2 line-clamp-2 hover:text-primary transition-colors cursor-pointer"
          onClick={() => navigate(`/product/${product.productId}`)}
        >
          {product.productName}
        </h4>
        
        <div className="flex items-center space-x-2 mb-2">
          <span className="text-lg font-bold text-red-500">
            {formatPrice(product.flashSalePrice)}
          </span>
          <span className="text-sm text-gray-500 line-through">
            {formatPrice(product.originalPrice)}
          </span>
        </div>
        
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>Đã bán: {product.soldCount}</span>
            <span>Còn: {product.remainingStock || (product.flashSaleStock - product.soldCount)}</span>
          </div>
          <Progress 
            value={getProgressPercentage(product.soldCount, product.flashSaleStock)} 
            className="h-2"
          />
        </div>
        
        <div className="flex flex-col gap-2">
          <Button 
            size="sm" 
            className="w-full bg-red-500 hover:bg-red-600"
            onClick={() => handleBuyNow(product)}
            disabled={(product.remainingStock || 0) <= 0}
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            Mua ngay
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            className="w-full"
            onClick={() => handleAddToCart(product)}
            disabled={(product.remainingStock || 0) <= 0}
          >
            Thêm vào giỏ
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Flash Sale Banner */}
        <div className="relative bg-gradient-to-r from-red-500 to-orange-500 rounded-lg overflow-hidden mb-8">
          <div className="p-8 text-white">
            <div className="flex items-center space-x-2 mb-4">
              <Zap className="h-8 w-8" />
              <h2 className="text-3xl font-bold">{flashSale.name}</h2>
              <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                <Zap className="h-4 w-4 mr-1" />
                Hot
              </Badge>
            </div>
            
            <p className="text-lg mb-6">{flashSale.description}</p>
            
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <Clock className="h-6 w-6" />
                <div>
                  <div className="text-sm opacity-90">Còn lại</div>
                  <div className="text-2xl font-bold">{timeRemaining}</div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-6 w-6" />
                <div>
                  <div className="text-sm opacity-90">Sản phẩm</div>
                  <div className="text-2xl font-bold">{flashSale.products.length}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Flash Sale Stats */}
        <div className="bg-white rounded-lg p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-red-500 mb-2">
                {flashSale.products.reduce((sum, product) => sum + product.soldCount, 0)}
              </div>
              <div className="text-sm text-gray-500">Đã bán</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-500 mb-2">
                {flashSale.products.reduce((sum, product) => sum + product.flashSaleStock, 0)}
              </div>
              <div className="text-sm text-gray-500">Tổng kho</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-500 mb-2">
                {Math.round(
                  flashSale.products.reduce((sum, product) => 
                    sum + getProgressPercentage(product.soldCount, product.flashSaleStock), 0
                  ) / flashSale.products.length
                )}%
              </div>
              <div className="text-sm text-gray-500">Trung bình bán</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-500 mb-2">
                {Math.round(
                  flashSale.products.reduce((sum, product) => 
                    sum + getDiscountPercentage(product.originalPrice, product.flashSalePrice), 0
                  ) / flashSale.products.length
                )}%
              </div>
              <div className="text-sm text-gray-500">Giảm giá TB</div>
            </div>
          </div>
        </div>

        {/* Flash Sale Products */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold">Sản phẩm Flash Sale</h3>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <AlertCircle className="h-4 w-4" />
              <span>Mỗi sản phẩm có giới hạn số lượng mua</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {flashSale.products && flashSale.products.length > 0 ? (
              flashSale.products.map((product) => (
                <FlashSaleProductCard key={product.productId} product={product} />
              ))
            ) : (
              <div className="col-span-full text-center py-8 text-gray-500">
                Chưa có sản phẩm trong flash sale này
              </div>
            )}
          </div>
        </div>

        {/* Flash Sale Rules */}
        <div className="bg-white rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Quy định Flash Sale</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-2">Thời gian</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Flash Sale diễn ra trong thời gian giới hạn</li>
                <li>• Sản phẩm có thể hết hàng trước khi kết thúc</li>
                <li>• Giá flash sale chỉ áp dụng trong thời gian quy định</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Mua hàng</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Mỗi sản phẩm có giới hạn số lượng mua</li>
                <li>• Không thể hủy đơn hàng flash sale</li>
                <li>• Áp dụng chính sách đổi trả thông thường</li>
              </ul>
            </div>
          </div>
        </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
