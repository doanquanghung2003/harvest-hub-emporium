import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Truck, CheckCircle, Clock, Eye, RotateCcw, X, MapPin, CreditCard, Calendar, ShoppingBag, User, Phone, Mail, Edit, Star } from "lucide-react";
import { AuthGuard } from "@/components/AuthGuard";
import { orderService, OrderDTO } from "@/services/orderService";
import { productService } from "@/services/productService";
import { reviewService, ReviewDTO } from "@/services/reviewService";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useNavigate } from "react-router-dom";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUpDown } from "lucide-react";

export default function Orders() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderDTO[]>([]);
  const [productNames, setProductNames] = useState<{[key: string]: string}>({});
  const [loadingOrderId, setLoadingOrderId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<OrderDTO | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [loadingOrderDetail, setLoadingOrderDetail] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [orderReviews, setOrderReviews] = useState<Record<string, { rating: number; comment: string; submitted: boolean; productId?: string; reviewId?: string }>>({});
  const [submittingReviewId, setSubmittingReviewId] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      try {
        const list = await orderService.getOrdersByUser(user.id);
        setOrders(list);
        if (user.id) {
          await preloadExistingReviews(list, user.id);
        }
        
        // Pre-populate product names from order data if available
        const initialProductNames: {[key: string]: string} = {};
        list.forEach(order => {
          if (order.items && order.items.length > 0) {
            order.items.forEach(item => {
              if (item.productName || item.name) {
                initialProductNames[item.productId] = item.productName || item.name || 'Tên sản phẩm không xác định';
              }
            });
          }
        });
        if (Object.keys(initialProductNames).length > 0) {
          setProductNames(initialProductNames);
        }
        
        // Load product names for display
        const productIds = list.flatMap(order => {
          if (order.items && order.items.length > 0) {
            return order.items.map(item => item.productId);
          } else if (order.productId) {
            return [order.productId];
          }
          return [];
        });
        const uniqueProductIds = [...new Set(productIds)];
        
        const productNamesMap: {[key: string]: string} = { ...initialProductNames };
        
        // Only load products that we don't already have names for
        const productsToLoad = uniqueProductIds.filter(id => !productNamesMap[id]);
        
        for (const productId of productsToLoad) {
          try {
            const product = await productService.getProductById(productId);
            productNamesMap[productId] = product.name;
          } catch (e) {
            // Fallback: try to get from all products list
            try {
              const allProducts = await productService.getProducts();
              const foundProduct = allProducts.find(p => p.id === productId);
              if (foundProduct) {
                productNamesMap[productId] = foundProduct.name;
              } else {
                productNamesMap[productId] = 'Tên sản phẩm không xác định';
              }
            } catch (fallbackError) {
              productNamesMap[productId] = 'Tên sản phẩm không xác định';
            }
          }
        }
        setProductNames(productNamesMap);
      } catch (e) {
        console.error('Failed to fetch orders', e);
      }
    };
    load();
  }, [user]);

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm('Bạn có chắc chắn muốn hủy đơn hàng này?')) {
      return;
    }

    try {
      setLoadingOrderId(orderId);
      await orderService.cancelMyOrder(orderId);
      
      toast({
        title: "Thành công",
        description: "Đã hủy đơn hàng thành công",
      });

      // Reload orders to show updated status
      if (user) {
        const updatedOrders = await orderService.getOrdersByUser(user.id);
        setOrders(updatedOrders);
      }
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể hủy đơn hàng",
        variant: "destructive",
      });
    } finally {
      setLoadingOrderId(null);
    }
  };
  const handleSelectRating = (orderId: string, rating: number, productId?: string) => {
    setOrderReviews(prev => ({
      ...prev,
      [orderId]: {
        rating,
        comment: prev[orderId]?.comment || "",
        submitted: prev[orderId]?.submitted || false,
        productId: prev[orderId]?.productId || productId,
        reviewId: prev[orderId]?.reviewId,
      },
    }));
  };

  const handleCommentChange = (orderId: string, comment: string, productId?: string) => {
    setOrderReviews(prev => ({
      ...prev,
      [orderId]: {
        rating: prev[orderId]?.rating || 0,
        comment,
        submitted: prev[orderId]?.submitted || false,
        productId: prev[orderId]?.productId || productId,
        reviewId: prev[orderId]?.reviewId,
      },
    }));
  };

  const handleSubmitReview = async (order: OrderDTO) => {
    const review = orderReviews[order.id];
    if (!review?.rating) {
      toast({
        title: "Chưa chọn số sao",
        description: "Hãy chọn số sao trước khi gửi đánh giá.",
        variant: "destructive",
      });
      return;
    }
    const primaryProductId = review.productId || getPrimaryProductId(order);
    if (!primaryProductId) {
      toast({
        title: "Thiếu thông tin sản phẩm",
        description: "Không xác định được sản phẩm để đánh giá.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmittingReviewId(order.id);
      const savedReview = await reviewService.submitOrderReview(order.id, {
        productId: primaryProductId,
        rating: review.rating,
        comment: review.comment?.trim() || undefined,
      });

      setOrderReviews(prev => ({
        ...prev,
        [order.id]: {
          rating: savedReview.rating,
          comment: savedReview.comment || review.comment || "",
          submitted: true,
          productId: savedReview.productId || primaryProductId,
          reviewId: savedReview.id,
        },
      }));

      toast({
        title: "Đã gửi đánh giá",
        description: `Cảm ơn bạn đã đánh giá ${review.rating} sao${review.comment ? " và chia sẻ cảm nhận" : ""}.`,
      });
    } catch (error: any) {
      toast({
        title: "Không thể gửi đánh giá",
        description: error?.message || "Vui lòng thử lại sau.",
        variant: "destructive",
      });
    } finally {
      setSubmittingReviewId(null);
    }
  };

  const renderRatingSection = (order: OrderDTO) => {
    if (order.status !== "delivered") return null;
    const defaultState = {
      rating: 0,
      comment: "",
      submitted: false,
      productId: getPrimaryProductId(order),
    };
    const review = orderReviews[order.id] || defaultState;
    const isSubmitting = submittingReviewId === order.id;

    if (review.submitted) {
      return (
        <div className="mt-4 p-4 border rounded-xl bg-gradient-to-r from-green-50/80 to-emerald-50/80 space-y-3">
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle className="h-5 w-5" />
            <p className="font-semibold">Bạn đã đánh giá đơn hàng này</p>
          </div>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`h-4 w-4 ${review.rating >= star ? "fill-yellow-400 text-yellow-500" : "text-gray-300"}`}
              />
            ))}
            <span className="font-semibold text-foreground ml-2">{review.rating}/5</span>
          </div>
          {review.comment && (
            <p className="text-sm text-muted-foreground bg-white/60 rounded-lg p-3 border">
              {review.comment}
            </p>
          )}
        </div>
      );
    }

    return (
      <div className="mt-4 p-4 border rounded-xl bg-gradient-to-r from-amber-50/80 to-emerald-50/80 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-lg text-foreground">Hãy đánh giá sản phẩm</p>
            <p className="text-sm text-muted-foreground">
              Chia sẻ trải nghiệm của bạn để giúp nhà bán cải thiện chất lượng dịch vụ.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className={`h-9 w-9 rounded-full border flex items-center justify-center transition-all ${
                  review.rating >= star
                    ? "bg-yellow-100 border-yellow-300 text-yellow-500"
                    : "border-muted text-muted-foreground hover:text-yellow-400"
                }`}
                onClick={() => handleSelectRating(order.id, star, review.productId || defaultState.productId)}
                disabled={isSubmitting}
              >
                <Star className={`h-4 w-4 ${review.rating >= star ? "fill-yellow-400 text-yellow-500" : ""}`} />
              </button>
            ))}
          </div>
        </div>
        <Textarea
          placeholder="Nhập cảm nhận của bạn (tùy chọn)"
          value={review.comment}
          onChange={(e) => handleCommentChange(order.id, e.target.value, review.productId || defaultState.productId)}
          disabled={isSubmitting}
          className="min-h-[90px] bg-white/70"
        />
        <div className="flex flex-wrap gap-2">
          <Button
            className="bg-primary text-white hover:bg-primary/90"
            onClick={() => handleSubmitReview(order)}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Đang gửi...
              </>
            ) : (
              "Gửi đánh giá"
            )}
          </Button>
        </div>
      </div>
    );
  };


  const getStatusColor = (status: string) => {
    switch (status) {
      case "delivered": return "bg-green-500";
      case "shipping": return "bg-blue-500"; 
      case "processing": return "bg-yellow-500";
      case "confirmed": return "bg-blue-500";
      case "packed": return "bg-purple-500";
      case "cancelled": return "bg-red-500";
      case "pending": return "bg-orange-500";
      default: return "bg-gray-500";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "delivered": return "Đã Giao";
      case "shipping": return "Đang Giao";
      case "processing": return "Đang Xử Lý";
      case "confirmed": return "Đã Xác Nhận";
      case "packed": return "Đã Đóng Gói";
      case "cancelled": return "Đã Hủy";
      case "pending": return "Chờ Duyệt";
      default: return "Không Xác Định";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "delivered": return <CheckCircle className="h-4 w-4" />;
      case "shipping": return <Truck className="h-4 w-4" />;
      case "processing": return <Clock className="h-4 w-4" />;
      case "confirmed": return <CheckCircle className="h-4 w-4" />;
      case "packed": return <Package className="h-4 w-4" />;
      case "cancelled": return <X className="h-4 w-4" />;
      case "pending": return <Clock className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  const handleViewOrderDetail = async (order: OrderDTO) => {
    setSelectedOrder(order);
    setIsDetailModalOpen(true);
    setLoadingOrderDetail(true);
    
    try {
      // Load fresh order details from API
      const orderDetail = await orderService.getOrderById(order.id);
      setSelectedOrder(orderDetail);
      
      // Load user profile for recipient information
      if (user) {
        try {
          const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || '';
          const token = localStorage.getItem('token');
          const response = await fetch(`${API_BASE_URL}/api/user/profile`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          if (response.ok) {
            const profileData = await response.json();
            setUserProfile(profileData);
          }
        } catch (profileError) {
          console.error('Failed to load user profile', profileError);
        }
      }
    } catch (error) {
      console.error('Failed to load order details', error);
      toast({
        title: "Lỗi",
        description: "Không thể tải chi tiết đơn hàng",
        variant: "destructive",
      });
    } finally {
      setLoadingOrderDetail(false);
    }
  };

  const formatDate = (timestamp?: number | string) => {
    if (!timestamp) return 'Chưa có thông tin';
    const date = typeof timestamp === 'string' ? new Date(parseInt(timestamp)) : new Date(timestamp);
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPaymentMethodText = (method?: string) => {
    switch (method) {
      case 'cod': return 'Thanh toán khi nhận hàng (COD)';
      case 'banking': return 'Chuyển khoản ngân hàng';
      default: return method || 'Chưa cập nhật';
    }
  };

  const getPaymentStatusText = (status?: string) => {
    switch (status) {
      case 'paid': return 'Đã thanh toán';
      case 'unpaid': return 'Chưa thanh toán';
      case 'failed': return 'Thanh toán thất bại';
      case 'refunded': return 'Đã hoàn tiền';
      default: return status || 'Chưa cập nhật';
    }
  };

  const getPrimaryProductId = (order: OrderDTO) => {
    if (order.items && order.items.length > 0) {
      return order.items[0].productId;
    }
    return order.productId;
  };

  // Sort orders by date
  const sortedOrders = useMemo(() => {
    const sorted = [...orders];
    sorted.sort((a, b) => {
      const dateA = a.createdAt ? (typeof a.createdAt === 'string' ? parseInt(a.createdAt) : a.createdAt) : 0;
      const dateB = b.createdAt ? (typeof b.createdAt === 'string' ? parseInt(b.createdAt) : b.createdAt) : 0;
      
      if (sortOrder === 'newest') {
        return dateB - dateA; // Mới nhất trước
      } else {
        return dateA - dateB; // Cũ nhất trước
      }
    });
    return sorted;
  }, [orders, sortOrder]);

  const preloadExistingReviews = async (ordersList: OrderDTO[], currentUserId: string) => {
    const deliveredOrders = ordersList.filter(order => String(order.status || '').toLowerCase() === 'delivered');
    if (deliveredOrders.length === 0) {
      return;
    }

    const updatedEntries: Record<string, { rating: number; comment: string; submitted: boolean; productId?: string; reviewId?: string }> = {};

    for (const order of deliveredOrders) {
      try {
        const reviews = await reviewService.getReviewsByOrder(order.id);
        const primaryProductId = getPrimaryProductId(order);
        const myReview = reviews.find((review: ReviewDTO) => {
          if (review.userId !== currentUserId) return false;
          if (!primaryProductId) return true;
          return review.productId === primaryProductId;
        });
        if (myReview) {
          updatedEntries[order.id] = {
            rating: myReview.rating,
            comment: myReview.comment || "",
            submitted: true,
            productId: myReview.productId || primaryProductId,
            reviewId: myReview.id,
          };
        } else if (primaryProductId && !orderReviews[order.id]) {
          updatedEntries[order.id] = {
            rating: 0,
            comment: "",
            submitted: false,
            productId: primaryProductId,
          };
        }
      } catch (error) {
        console.error('Failed to preload reviews for order', order.id, error);
      }
    }

    if (Object.keys(updatedEntries).length > 0) {
      setOrderReviews(prev => ({ ...prev, ...updatedEntries }));
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 py-8 bg-gradient-to-br from-background via-secondary/30 to-accent/10">
          <div className="container mx-auto px-4">
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent mb-2">
                    Đơn Hàng Của Tôi
                  </h1>
                  <p className="text-muted-foreground">Quản lý và theo dõi đơn hàng của bạn</p>
                </div>
                <div className="flex items-center gap-2">
                  <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                  <Select value={sortOrder} onValueChange={(value: 'newest' | 'oldest') => setSortOrder(value)}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Sắp xếp" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Mới nhất → Cũ nhất</SelectItem>
                      <SelectItem value="oldest">Cũ nhất → Mới nhất</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          
          <Tabs defaultValue="all" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5 bg-muted/50 rounded-xl h-12">
              <TabsTrigger value="all" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Tất Cả</TabsTrigger>
              <TabsTrigger value="processing" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Đang Xử Lý</TabsTrigger>
              <TabsTrigger value="shipping" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Đang Giao</TabsTrigger>
              <TabsTrigger value="delivered" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Đã Giao</TabsTrigger>
              <TabsTrigger value="cancelled" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Đã Hủy</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="space-y-4">
              {sortedOrders.length === 0 ? (
                  <div className="text-center py-16 bg-card/50 backdrop-blur-sm rounded-2xl border shadow-soft">
                  <ShoppingBag className="h-20 w-20 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <h3 className="text-xl font-semibold mb-2">Chưa có đơn hàng nào</h3>
                  <p className="text-muted-foreground mb-6">Bắt đầu mua sắm để xem đơn hàng của bạn ở đây</p>
                  <Button onClick={() => navigate('/marketplace')} className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90">
                    <ShoppingBag className="h-4 w-4 mr-2" />
                    Mua sắm ngay
                  </Button>
                </div>
              ) : (
                sortedOrders.map((order) => (
                  <Card key={order.id} className="overflow-hidden border-2 hover:shadow-lg transition-all duration-300 hover:scale-[1.01] bg-card/50 backdrop-blur-sm">
                    <CardHeader className="bg-gradient-to-r from-primary/5 to-accent/5 border-b">
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Badge variant="outline" className="font-mono text-xs">
                              #{order.id.slice(0, 8).toUpperCase()}
                            </Badge>
                            <Badge className={`${getStatusColor(order.status || 'processing')} text-white`}>
                              {getStatusIcon(order.status || 'processing')}
                              <span className="ml-1">{getStatusText(order.status || 'processing')}</span>
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>{formatDate(order.createdAt)}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                            {order.totalPrice?.toLocaleString() || order.total || '0'}đ
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        {/* Order Items */}
                        <div className="space-y-3">
                          {order.items && order.items.length > 0 ? (
                            order.items.map((item, index) => (
                              <div key={index} className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg border hover:bg-muted/50 transition-colors">
                                {item.imageSnapshot ? (
                                  <img 
                                    src={item.imageSnapshot} 
                                    alt={item.nameSnapshot || item.productName || item.name || 'Sản phẩm'}
                                    className="w-16 h-16 object-cover rounded-lg border-2 border-muted"
                                  />
                                ) : (
                                  <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center border-2 border-muted">
                                    <Package className="h-8 w-8 text-muted-foreground" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-foreground truncate">
                                    {productNames[item.productId] || item.nameSnapshot || item.productName || item.name || 'Tên sản phẩm không xác định'}
                                  </p>
                                  <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                                    <span>Số lượng: <strong className="text-foreground">{item.quantity}</strong></span>
                                    <span>•</span>
                                    <span>{(item.unitPrice || Number(item.price) || 0).toLocaleString()}đ/đơn vị</span>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold text-lg">
                                    {((item.unitPrice || Number(item.price) || 0) * item.quantity).toLocaleString()}đ
                                  </p>
                                </div>
                              </div>
                            ))
                          ) : order.productId ? (
                            <div className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg border">
                              <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center border-2 border-muted">
                                <Package className="h-8 w-8 text-muted-foreground" />
                              </div>
                              <div className="flex-1">
                                <p className="font-semibold">
                                  {productNames[order.productId] || 'Tên sản phẩm không xác định'}
                                </p>
                                <p className="text-sm text-muted-foreground mt-1">
                                  Số lượng: <strong className="text-foreground">{order.quantity || 0}</strong>
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-lg">
                                  {order.totalPrice?.toLocaleString() || '0'}đ
                                </p>
                              </div>
                            </div>
                          ) : null}
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex flex-wrap gap-2 pt-2 border-t">
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="flex-1 sm:flex-none"
                            onClick={() => handleViewOrderDetail(order)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Xem Chi Tiết
                          </Button>
                          
                          {/* Nút hủy đơn hàng - chỉ hiện khi có thể hủy */}
                          {(order.status === "pending" || order.status === "processing" || order.status === "confirmed") && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                              onClick={() => handleCancelOrder(order.id)}
                              disabled={loadingOrderId === order.id}
                            >
                              {loadingOrderId === order.id ? (
                                <Clock className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <X className="h-4 w-4 mr-2" />
                              )}
                              Hủy Đặt Hàng
                            </Button>
                          )}
                          
                          {order.status === "delivered" && (
                            <Button variant="outline" size="sm" className="text-green-600 border-green-200 hover:bg-green-50">
                              <RotateCcw className="h-4 w-4 mr-2" />
                              Mua Lại
                            </Button>
                          )}
                          {order.status === "shipping" && (
                            <Button variant="outline" size="sm" className="text-blue-600 border-blue-200 hover:bg-blue-50">
                              <Truck className="h-4 w-4 mr-2" />
                              Theo Dõi
                            </Button>
                          )}
                        </div>
                        {renderRatingSection(order)}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
            
            <TabsContent value="processing">
              <div className="space-y-4">
                {sortedOrders.filter(order => order.status === "processing" || order.status === "pending" || order.status === "confirmed").length === 0 ? (
                  <div className="text-center py-16 bg-card/50 backdrop-blur-sm rounded-2xl border shadow-soft">
                    <Clock className="h-20 w-20 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <h3 className="text-xl font-semibold mb-2">Không có đơn hàng đang xử lý</h3>
                    <p className="text-muted-foreground">Các đơn hàng đang xử lý sẽ hiển thị ở đây</p>
                  </div>
                ) : (
                  sortedOrders.filter(order => order.status === "processing" || order.status === "pending" || order.status === "confirmed").map((order) => (
                    <Card key={order.id} className="overflow-hidden border-2 hover:shadow-lg transition-all duration-300 hover:scale-[1.01] bg-card/50 backdrop-blur-sm">
                      <CardHeader className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-b">
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <Badge variant="outline" className="font-mono text-xs">
                                #{order.id.slice(0, 8).toUpperCase()}
                              </Badge>
                              <Badge className={`${getStatusColor(order.status || 'processing')} text-white`}>
                                {getStatusIcon(order.status || 'processing')}
                                <span className="ml-1">{getStatusText(order.status || 'processing')}</span>
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              <span>{formatDate(order.createdAt)}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                              {order.totalPrice?.toLocaleString() || order.total || '0'}đ
                            </p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-6">
                        <div className="space-y-4">
                          <div className="space-y-3">
                            {order.items && order.items.length > 0 ? (
                              order.items.map((item, index) => (
                                <div key={index} className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg border hover:bg-muted/50 transition-colors">
                                  {item.imageSnapshot ? (
                                    <img 
                                      src={item.imageSnapshot} 
                                      alt={item.nameSnapshot || item.productName || item.name || 'Sản phẩm'}
                                      className="w-16 h-16 object-cover rounded-lg border-2 border-muted"
                                    />
                                  ) : (
                                    <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center border-2 border-muted">
                                      <Package className="h-8 w-8 text-muted-foreground" />
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-foreground truncate">
                                      {productNames[item.productId] || item.nameSnapshot || item.productName || item.name || 'Tên sản phẩm không xác định'}
                                    </p>
                                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                                      <span>Số lượng: <strong className="text-foreground">{item.quantity}</strong></span>
                                      <span>•</span>
                                      <span>{(item.unitPrice || Number(item.price) || 0).toLocaleString()}đ/đơn vị</span>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-bold text-lg">
                                      {((item.unitPrice || Number(item.price) || 0) * item.quantity).toLocaleString()}đ
                                    </p>
                                  </div>
                                </div>
                              ))
                            ) : order.productId ? (
                              <div className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg border">
                                <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center border-2 border-muted">
                                  <Package className="h-8 w-8 text-muted-foreground" />
                                </div>
                                <div className="flex-1">
                                  <p className="font-semibold">
                                    {productNames[order.productId] || 'Tên sản phẩm không xác định'}
                                  </p>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    Số lượng: <strong className="text-foreground">{order.quantity || 0}</strong>
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold text-lg">
                                    {order.totalPrice?.toLocaleString() || '0'}đ
                                  </p>
                                </div>
                              </div>
                            ) : null}
                          </div>
                          
                          <div className="flex flex-wrap gap-2 pt-2 border-t">
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="flex-1 sm:flex-none"
                              onClick={() => handleViewOrderDetail(order)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Xem Chi Tiết
                            </Button>
                            
                            {(order.status === "pending" || order.status === "processing" || order.status === "confirmed") && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                                onClick={() => handleCancelOrder(order.id)}
                                disabled={loadingOrderId === order.id}
                              >
                                {loadingOrderId === order.id ? (
                                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <X className="h-4 w-4 mr-2" />
                                )}
                                Hủy Đặt Hàng
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="shipping">
              <div className="space-y-4">
                {sortedOrders.filter(order => order.status === "shipping").length === 0 ? (
                  <div className="text-center py-16 bg-card/50 backdrop-blur-sm rounded-2xl border shadow-soft">
                    <Truck className="h-20 w-20 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <h3 className="text-xl font-semibold mb-2">Không có đơn hàng đang giao</h3>
                    <p className="text-muted-foreground">Các đơn hàng đang giao sẽ hiển thị ở đây</p>
                  </div>
                ) : (
                  sortedOrders.filter(order => order.status === "shipping").map((order) => (
                    <Card key={order.id} className="overflow-hidden border-2 border-blue-200 hover:shadow-lg transition-all duration-300 hover:scale-[1.01] bg-card/50 backdrop-blur-sm">
                      <CardHeader className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-b">
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <Badge variant="outline" className="font-mono text-xs">
                                #{order.id.slice(0, 8).toUpperCase()}
                              </Badge>
                              <Badge className="bg-blue-500 text-white">
                                <Truck className="h-4 w-4 mr-1" />
                                Đang Giao
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              <span>{formatDate(order.createdAt)}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                              {order.totalPrice?.toLocaleString() || order.total || '0'}đ
                            </p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-6">
                        <div className="space-y-4">
                          <div className="space-y-3">
                            {order.items && order.items.length > 0 ? (
                              order.items.map((item, index) => (
                                <div key={index} className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg border hover:bg-muted/50 transition-colors">
                                  {item.imageSnapshot ? (
                                    <img 
                                      src={item.imageSnapshot} 
                                      alt={item.nameSnapshot || item.productName || item.name || 'Sản phẩm'}
                                      className="w-16 h-16 object-cover rounded-lg border-2 border-muted"
                                    />
                                  ) : (
                                    <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center border-2 border-muted">
                                      <Package className="h-8 w-8 text-muted-foreground" />
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-foreground truncate">
                                      {productNames[item.productId] || item.nameSnapshot || item.productName || item.name || 'Tên sản phẩm không xác định'}
                                    </p>
                                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                                      <span>Số lượng: <strong className="text-foreground">{item.quantity}</strong></span>
                                      <span>•</span>
                                      <span>{(item.unitPrice || Number(item.price) || 0).toLocaleString()}đ/đơn vị</span>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-bold text-lg">
                                      {((item.unitPrice || Number(item.price) || 0) * item.quantity).toLocaleString()}đ
                                    </p>
                                  </div>
                                </div>
                              ))
                            ) : order.productId ? (
                              <div className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg border">
                                <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center border-2 border-muted">
                                  <Package className="h-8 w-8 text-muted-foreground" />
                                </div>
                                <div className="flex-1">
                                  <p className="font-semibold">
                                    {productNames[order.productId] || 'Tên sản phẩm không xác định'}
                                  </p>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    Số lượng: <strong className="text-foreground">{order.quantity || 0}</strong>
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold text-lg">
                                    {order.totalPrice?.toLocaleString() || '0'}đ
                                  </p>
                                </div>
                              </div>
                            ) : null}
                          </div>
                          
                          <div className="flex flex-wrap gap-2 pt-2 border-t">
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="flex-1 sm:flex-none"
                              onClick={() => handleViewOrderDetail(order)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Xem Chi Tiết
                            </Button>
                            <Button variant="outline" size="sm" className="text-blue-600 border-blue-200 hover:bg-blue-50">
                              <Truck className="h-4 w-4 mr-2" />
                              Theo Dõi Đơn Hàng
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="delivered">
              <div className="space-y-4">
                {sortedOrders.filter(order => order.status === "delivered").length === 0 ? (
                  <div className="text-center py-16 bg-card/50 backdrop-blur-sm rounded-2xl border shadow-soft">
                    <CheckCircle className="h-20 w-20 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <h3 className="text-xl font-semibold mb-2">Không có đơn hàng đã giao</h3>
                    <p className="text-muted-foreground">Các đơn hàng đã giao sẽ hiển thị ở đây</p>
                  </div>
                ) : (
                  sortedOrders.filter(order => order.status === "delivered").map((order) => (
                    <Card key={order.id} className="overflow-hidden border-2 border-green-200 hover:shadow-lg transition-all duration-300 hover:scale-[1.01] bg-card/50 backdrop-blur-sm">
                      <CardHeader className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-b">
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <Badge variant="outline" className="font-mono text-xs">
                                #{order.id.slice(0, 8).toUpperCase()}
                              </Badge>
                              <Badge className="bg-green-500 text-white">
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Đã Giao
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              <span>{formatDate(order.createdAt)}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                              {order.totalPrice?.toLocaleString() || order.total || '0'}đ
                            </p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-6">
                        <div className="space-y-4">
                          <div className="space-y-3">
                            {order.items && order.items.length > 0 ? (
                              order.items.map((item, index) => (
                                <div key={index} className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg border hover:bg-muted/50 transition-colors">
                                  {item.imageSnapshot ? (
                                    <img 
                                      src={item.imageSnapshot} 
                                      alt={item.nameSnapshot || item.productName || item.name || 'Sản phẩm'}
                                      className="w-16 h-16 object-cover rounded-lg border-2 border-muted"
                                    />
                                  ) : (
                                    <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center border-2 border-muted">
                                      <Package className="h-8 w-8 text-muted-foreground" />
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-foreground truncate">
                                      {productNames[item.productId] || item.nameSnapshot || item.productName || item.name || 'Tên sản phẩm không xác định'}
                                    </p>
                                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                                      <span>Số lượng: <strong className="text-foreground">{item.quantity}</strong></span>
                                      <span>•</span>
                                      <span>{(item.unitPrice || Number(item.price) || 0).toLocaleString()}đ/đơn vị</span>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-bold text-lg">
                                      {((item.unitPrice || Number(item.price) || 0) * item.quantity).toLocaleString()}đ
                                    </p>
                                  </div>
                                </div>
                              ))
                            ) : order.productId ? (
                              <div className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg border">
                                <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center border-2 border-muted">
                                  <Package className="h-8 w-8 text-muted-foreground" />
                                </div>
                                <div className="flex-1">
                                  <p className="font-semibold">
                                    {productNames[order.productId] || 'Tên sản phẩm không xác định'}
                                  </p>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    Số lượng: <strong className="text-foreground">{order.quantity || 0}</strong>
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold text-lg">
                                    {order.totalPrice?.toLocaleString() || '0'}đ
                                  </p>
                                </div>
                              </div>
                            ) : null}
                          </div>
                          
                          <div className="flex flex-wrap gap-2 pt-2 border-t">
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="flex-1 sm:flex-none"
                              onClick={() => handleViewOrderDetail(order)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Xem Chi Tiết
                            </Button>
                            <Button variant="outline" size="sm" className="text-green-600 border-green-200 hover:bg-green-50">
                              <RotateCcw className="h-4 w-4 mr-2" />
                              Mua Lại
                            </Button>
                          </div>
                          {renderRatingSection(order)}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="cancelled">
              <div className="space-y-4">
                {sortedOrders.filter(order => order.status === "cancelled").length === 0 ? (
                  <div className="text-center py-16 bg-card/50 backdrop-blur-sm rounded-2xl border shadow-soft">
                    <X className="h-20 w-20 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <h3 className="text-xl font-semibold mb-2">Không có đơn hàng đã hủy</h3>
                    <p className="text-muted-foreground">Các đơn hàng đã hủy sẽ hiển thị ở đây</p>
                  </div>
                ) : (
                  sortedOrders.filter(order => order.status === "cancelled").map((order) => (
                    <Card key={order.id} className="overflow-hidden border-2 border-red-200 hover:shadow-lg transition-all duration-300 hover:scale-[1.01] bg-card/50 backdrop-blur-sm opacity-75">
                      <CardHeader className="bg-gradient-to-r from-red-500/10 to-rose-500/10 border-b">
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <Badge variant="outline" className="font-mono text-xs">
                                #{order.id.slice(0, 8).toUpperCase()}
                              </Badge>
                              <Badge className="bg-red-500 text-white">
                                <X className="h-4 w-4 mr-1" />
                                Đã Hủy
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              <span>{formatDate(order.createdAt)}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold line-through text-muted-foreground">
                              {order.totalPrice?.toLocaleString() || order.total || '0'}đ
                            </p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-6">
                        <div className="space-y-4">
                          <div className="space-y-3">
                            {order.items && order.items.length > 0 ? (
                              order.items.map((item, index) => (
                                <div key={index} className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg border opacity-60">
                                  {item.imageSnapshot ? (
                                    <img 
                                      src={item.imageSnapshot} 
                                      alt={item.nameSnapshot || item.productName || item.name || 'Sản phẩm'}
                                      className="w-16 h-16 object-cover rounded-lg border-2 border-muted grayscale"
                                    />
                                  ) : (
                                    <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center border-2 border-muted">
                                      <Package className="h-8 w-8 text-muted-foreground" />
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-foreground truncate">
                                      {productNames[item.productId] || item.nameSnapshot || item.productName || item.name || 'Tên sản phẩm không xác định'}
                                    </p>
                                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                                      <span>Số lượng: <strong className="text-foreground">{item.quantity}</strong></span>
                                      <span>•</span>
                                      <span>{(item.unitPrice || Number(item.price) || 0).toLocaleString()}đ/đơn vị</span>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-bold text-lg line-through text-muted-foreground">
                                      {((item.unitPrice || Number(item.price) || 0) * item.quantity).toLocaleString()}đ
                                    </p>
                                  </div>
                                </div>
                              ))
                            ) : order.productId ? (
                              <div className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg border opacity-60">
                                <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center border-2 border-muted">
                                  <Package className="h-8 w-8 text-muted-foreground" />
                                </div>
                                <div className="flex-1">
                                  <p className="font-semibold">
                                    {productNames[order.productId] || 'Tên sản phẩm không xác định'}
                                  </p>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    Số lượng: <strong className="text-foreground">{order.quantity || 0}</strong>
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold text-lg line-through text-muted-foreground">
                                    {order.totalPrice?.toLocaleString() || '0'}đ
                                  </p>
                                </div>
                              </div>
                            ) : null}
                          </div>
                          
                          <div className="flex flex-wrap gap-2 pt-2 border-t">
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="flex-1 sm:flex-none"
                              onClick={() => handleViewOrderDetail(order)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Xem Chi Tiết
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
      
      {/* Order Detail Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b pb-4">
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Chi Tiết Đơn Hàng
            </DialogTitle>
            <DialogDescription className="text-base mt-2">
              {selectedOrder ? (
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold">#{selectedOrder.id.slice(0, 8).toUpperCase()}</span>
                  <Badge variant="outline" className="ml-2">
                    {formatDate(selectedOrder.createdAt)}
                  </Badge>
                </div>
              ) : ''}
            </DialogDescription>
          </DialogHeader>
          
          {loadingOrderDetail ? (
            <div className="flex items-center justify-center py-12">
              <Clock className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-3 text-lg">Đang tải chi tiết đơn hàng...</span>
            </div>
          ) : selectedOrder ? (
            <div className="space-y-6 py-2">
              {/* Order Status & Total */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gradient-to-r from-primary/5 to-accent/5 rounded-lg border">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Trạng thái đơn hàng</p>
                  <Badge className={`${getStatusColor(selectedOrder.status || 'processing')} text-white text-sm px-3 py-1`}>
                    {getStatusIcon(selectedOrder.status || 'processing')}
                    <span className="ml-2">{getStatusText(selectedOrder.status || 'processing')}</span>
                  </Badge>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground mb-2">Tổng tiền</p>
                  <p className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    {selectedOrder.totalPrice?.toLocaleString() || selectedOrder.total || '0'}đ
                  </p>
                </div>
              </div>
              
              {/* Recipient Information */}
              {userProfile && (
                <>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <User className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-semibold">Thông tin người nhận</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg border">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Họ tên:</span>
                        </div>
                        <p className="font-medium pl-6">
                          {userProfile.firstName && userProfile.lastName 
                            ? `${userProfile.firstName} ${userProfile.lastName}`
                            : userProfile.fullName || user?.name || 'Chưa cập nhật'}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Số điện thoại:</span>
                        </div>
                        <p className="font-medium pl-6">
                          {userProfile.phoneNumber || 'Chưa cập nhật'}
                        </p>
                      </div>
                      {userProfile.email && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">Email:</span>
                          </div>
                          <p className="font-medium pl-6">{userProfile.email}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <Separator />
                </>
              )}
              
              {/* Shipping Address */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">Địa chỉ giao hàng</h3>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg border">
                  {typeof selectedOrder.shippingAddress === 'string' ? (
                    <p className="text-sm leading-relaxed">
                      {selectedOrder.shippingAddress || 'Chưa cập nhật địa chỉ'}
                    </p>
                  ) : selectedOrder.shippingAddress ? (
                    <div className="space-y-1 text-sm">
                      <p className="font-medium">
                        {selectedOrder.shippingAddress.address || ''}
                      </p>
                      <p className="text-muted-foreground">
                        {[
                          selectedOrder.shippingAddress.ward,
                          selectedOrder.shippingAddress.district,
                          selectedOrder.shippingAddress.city
                        ].filter(Boolean).join(', ')}
                      </p>
                    </div>
                  ) : userProfile ? (
                    <div className="space-y-1 text-sm">
                      {userProfile.addressStreet && (
                        <p className="font-medium">{userProfile.addressStreet}</p>
                      )}
                      <p className="text-muted-foreground">
                        {[
                          userProfile.addressWard,
                          userProfile.addressDistrict,
                          userProfile.addressCity
                        ].filter(Boolean).join(', ') || 'Chưa cập nhật địa chỉ'}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Chưa cập nhật địa chỉ</p>
                  )}
                </div>
              </div>
              
              <Separator />
              
              {/* Order Items */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  Sản phẩm ({selectedOrder.items?.length || (selectedOrder.productId ? 1 : 0)})
                </h3>
                <div className="space-y-3">
                  {selectedOrder.items && selectedOrder.items.length > 0 ? (
                    selectedOrder.items.map((item, index) => (
                      <div key={index} className="flex items-start gap-4 p-4 border-2 rounded-lg hover:bg-muted/30 transition-colors">
                        {item.imageSnapshot ? (
                          <img 
                            src={item.imageSnapshot} 
                            alt={item.nameSnapshot || item.productName || item.name || 'Sản phẩm'}
                            className="w-20 h-20 object-cover rounded-lg border-2 border-muted"
                          />
                        ) : (
                          <div className="w-20 h-20 bg-muted rounded-lg flex items-center justify-center border-2 border-muted">
                            <Package className="h-10 w-10 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-base mb-1">
                            {productNames[item.productId] || item.nameSnapshot || item.productName || item.name || 'Tên sản phẩm không xác định'}
                          </p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>Số lượng: <strong className="text-foreground">{item.quantity}</strong></span>
                            <span>•</span>
                            <span>{(item.unitPrice || Number(item.price) || 0).toLocaleString()}đ/đơn vị</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg text-primary">
                            {((item.unitPrice || Number(item.price) || 0) * item.quantity).toLocaleString()}đ
                          </p>
                        </div>
                      </div>
                    ))
                  ) : selectedOrder.productId ? (
                    <div className="flex items-start gap-4 p-4 border-2 rounded-lg">
                      <div className="w-20 h-20 bg-muted rounded-lg flex items-center justify-center border-2 border-muted">
                        <Package className="h-10 w-10 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-base mb-1">
                          {productNames[selectedOrder.productId] || 'Tên sản phẩm không xác định'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Số lượng: <strong className="text-foreground">{selectedOrder.quantity || 0}</strong>
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg text-primary">
                          {selectedOrder.totalPrice?.toLocaleString() || '0'}đ
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 border-2 border-dashed rounded-lg">
                      <Package className="h-12 w-12 text-muted-foreground mx-auto mb-2 opacity-50" />
                      <p className="text-sm text-muted-foreground">Không có sản phẩm</p>
                    </div>
                  )}
                </div>
              </div>
              
              <Separator />
              
              {/* Payment Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  Thông tin thanh toán
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-muted/30 rounded-lg border">
                    <p className="text-sm text-muted-foreground mb-2">Phương thức thanh toán</p>
                    <p className="font-medium">
                      {getPaymentMethodText(selectedOrder.paymentMethod)}
                    </p>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg border">
                    <p className="text-sm text-muted-foreground mb-2">Trạng thái thanh toán</p>
                    <Badge 
                      variant={selectedOrder.paymentStatus === 'paid' ? 'default' : 'secondary'}
                      className={selectedOrder.paymentStatus === 'paid' ? 'bg-green-500' : ''}
                    >
                      {getPaymentStatusText(selectedOrder.paymentStatus)}
                    </Badge>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              {/* Order Dates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                  <Calendar className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Ngày đặt hàng</p>
                    <p className="font-medium">{formatDate(selectedOrder.createdAt)}</p>
                  </div>
                </div>
                {selectedOrder.updatedAt && selectedOrder.updatedAt !== selectedOrder.createdAt && (
                  <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                    <Edit className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Cập nhật lần cuối</p>
                      <p className="font-medium">{formatDate(selectedOrder.updatedAt)}</p>
                    </div>
                  </div>
                )}
              </div>
              
              <Separator />
              
              {/* Order Summary */}
              <div className="space-y-3 p-4 bg-gradient-to-r from-primary/5 to-accent/5 rounded-lg border-2">
                <h3 className="text-lg font-semibold">Tóm tắt đơn hàng</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tạm tính</span>
                    <span className="font-medium">
                      {((selectedOrder.totalPrice || 0) - (selectedOrder.shippingFee || 0)).toLocaleString()}đ
                    </span>
                  </div>
                  {selectedOrder.shippingFee && selectedOrder.shippingFee > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Phí vận chuyển</span>
                      <span className="font-medium">{selectedOrder.shippingFee.toLocaleString()}đ</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between text-xl font-bold pt-2">
                    <span>Tổng cộng</span>
                    <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                      {selectedOrder.totalPrice?.toLocaleString() || selectedOrder.total || '0'}đ
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-lg text-muted-foreground">Không thể tải chi tiết đơn hàng</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
    </AuthGuard>
  );
}