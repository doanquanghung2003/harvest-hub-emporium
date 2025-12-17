import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Clock, 
  Zap, 
  ShoppingCart,
  ArrowRight
} from 'lucide-react';
import { flashSaleService, FlashSale, FlashSaleProduct } from '@/services/flashSaleService';

export function FlashSaleSection() {
  const [flashSale, setFlashSale] = useState<FlashSale | null>(null);
  const [timeRemaining, setTimeRemaining] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFlashSale = async () => {
      try {
        const activeFlashSales = await flashSaleService.getActiveFlashSales();
        if (activeFlashSales && activeFlashSales.length > 0) {
          setFlashSale(activeFlashSales[0]);
        } else {
          const upcomingFlashSales = await flashSaleService.getUpcomingFlashSales();
          if (upcomingFlashSales && upcomingFlashSales.length > 0) {
            setFlashSale(upcomingFlashSales[0]);
          }
        }
      } catch (error) {
        console.error('Error loading flash sale:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFlashSale();
  }, []);

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

  const getProgressPercentage = (soldCount: number, stock: number) => {
    if (stock === 0) return 0;
    return Math.min((soldCount / stock) * 100, 100);
  };

  if (loading) {
    return null;
  }

  if (!flashSale || !flashSale.products || flashSale.products.length === 0) {
    return null;
  }

  // Chỉ hiển thị 4 sản phẩm đầu tiên
  const displayProducts = flashSale.products.slice(0, 4);

  return (
    <section className="py-12 bg-gradient-to-br from-red-50 to-orange-50">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-r from-red-500 to-orange-500 p-3 rounded-lg">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Flash Sale</h2>
              <p className="text-gray-600">{flashSale.name}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-center">
              <div className="flex items-center space-x-2 text-sm text-gray-600 mb-1">
                <Clock className="h-4 w-4" />
                <span>Còn lại</span>
              </div>
              <div className="text-2xl font-bold text-red-500">{timeRemaining}</div>
            </div>
            <Link to="/flashsale">
              <Button variant="outline" className="flex items-center space-x-2">
                <span>Xem tất cả</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {displayProducts.map((product) => (
            <Card key={product.productId} className="relative overflow-hidden hover:shadow-lg transition-shadow">
              <Link to={`/product/${product.productId}`} className="block">
                <div className="relative">
                  <img 
                    src={product.productImage || '/placeholder.svg'} 
                    alt={product.productName}
                    className="w-full h-48 object-cover cursor-pointer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/placeholder.svg';
                    }}
                  />
                  <Badge className="absolute top-2 left-2 bg-red-500">
                    -{Math.round(product.discountPercentage || 0)}%
                  </Badge>
                </div>
              </Link>
              
              <CardContent className="p-4">
                <Link to={`/product/${product.productId}`}>
                  <h4 className="font-semibold text-sm mb-2 line-clamp-2 hover:text-primary transition-colors cursor-pointer">{product.productName}</h4>
                </Link>
                
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
                
                <Link to={`/product/${product.productId}`}>
                  <Button size="sm" className="w-full bg-red-500 hover:bg-red-600">
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Mua ngay
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* View All Button (Mobile) */}
        <div className="mt-6 text-center lg:hidden">
          <Link to="/flashsale">
            <Button variant="outline" className="w-full sm:w-auto">
              Xem tất cả sản phẩm Flash Sale
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

