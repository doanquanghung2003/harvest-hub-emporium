import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Star, Heart, ShoppingCart, Truck, Shield, RotateCcw, Store, MapPin, Phone, Mail, MessageCircle, Clock, ThumbsUp, MoreVertical, Image as ImageIcon, Video } from "lucide-react";
import { productService } from "@/services/productService";
import { cartService } from "@/services/cartService";
import { useAuth } from "@/hooks/useAuth";
import { Product } from "@/types/product";
import { favoritesService } from "@/services/favoritesService";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { reviewService, ReviewDTO } from "@/services/reviewService";
import { messageService, Conversation as ConversationDTO, Message as ConversationMessageDTO } from "@/services/messageService";
import { flashSaleService, FlashSaleProduct } from "@/services/flashSaleService";

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || "";
const API_PREFIX = API_BASE_URL ? `${API_BASE_URL}/api` : "/api";

type ChatMessage = {
  id: string;
  sender: "user" | "seller";
  text: string;
  timestamp: Date;
};

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [sellerInfo, setSellerInfo] = useState<any>(null);
  const [isSellerLoading, setIsSellerLoading] = useState(false);
  const [sellerError, setSellerError] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [activeConversation, setActiveConversation] = useState<ConversationDTO | null>(null);
  const [isLoadingChatHistory, setIsLoadingChatHistory] = useState(false);
  const [reviews, setReviews] = useState<ReviewDTO[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [reviewFilter, setReviewFilter] = useState<'all' | '5' | '4' | '3' | '2' | '1' | 'with-comment' | 'with-media'>('all');
  const [flashSaleProduct, setFlashSaleProduct] = useState<FlashSaleProduct | null>(null);

  // Scroll to top when component mounts or product ID changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [id]);

  useEffect(() => {
    const loadProduct = async () => {
      if (!id) return;
      
      try {
        setIsLoading(true);
        setFlashSaleProduct(null); // Reset flash sale product when loading new product
        const fetchedProduct = await productService.getProductById(id);
        setProduct(fetchedProduct);
        
        // Load flash sale info for this product
        try {
          const activeFlashSales = await flashSaleService.getActiveFlashSales();
          // Find if this product is in any active flash sale
          for (const flashSale of activeFlashSales) {
            const flashSaleProduct = flashSale.products?.find(
              (p) => p.productId === id || p.productId === fetchedProduct.id
            );
            if (flashSaleProduct) {
              setFlashSaleProduct(flashSaleProduct);
              break;
            }
          }
        } catch (flashSaleError) {
          console.error('Error loading flash sale info:', flashSaleError);
          // Don't fail the whole page if flash sale loading fails
        }
      } catch (error) {
        console.error('Error loading product:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadProduct();
  }, [id]);

  useEffect(() => {
    const loadReviews = async () => {
      // Sử dụng productId từ product object nếu có, nếu không thì dùng id từ URL
      const productIdToUse = product?.id || id;
      
      if (!productIdToUse) {
        setReviews([]);
        return;
      }
      
      try {
        setIsLoadingReviews(true);
        console.log('=== Loading Reviews Debug ===');
        console.log('Product ID from URL:', id);
        console.log('Current product:', product);
        console.log('Product ID from product object:', product?.id);
        console.log('Using productId:', productIdToUse);
        
        const reviewList = await reviewService.getReviewsByProduct(productIdToUse);
        console.log('Raw reviews from API:', reviewList);
        console.log('Number of reviews:', reviewList?.length || 0);
        
        // Filter chỉ hiển thị reviews đã được approved (hoặc không có status)
        // Tạm thời hiển thị tất cả để debug
        const approvedReviews = Array.isArray(reviewList) 
          ? reviewList.filter((r: ReviewDTO) => {
              // Hiển thị tất cả reviews (kể cả pending) để test
              const shouldShow = !r.status || r.status === 'approved' || r.status === 'pending' || r.status === '';
              if (!shouldShow) {
                console.log('Filtered out review:', r.id, 'status:', r.status);
              }
              return shouldShow;
            })
          : [];
        
        console.log('Filtered approved reviews:', approvedReviews);
        console.log('Setting reviews state with', approvedReviews.length, 'reviews');
        setReviews(approvedReviews);
      } catch (error: any) {
        console.error("Failed to load reviews:", error);
        console.error("Error details:", error.message, error.stack);
        toast({
          title: "Lỗi",
          description: `Không thể tải đánh giá: ${error.message || 'Lỗi không xác định'}`,
          variant: "destructive",
        });
        setReviews([]);
      } finally {
        setIsLoadingReviews(false);
      }
    };

    // Load reviews khi id hoặc product.id thay đổi
    loadReviews();
  }, [id, product?.id]);

  useEffect(() => {
    const fetchSellerInfo = async () => {
      if (!product?.sellerId) {
        setSellerInfo(null);
        return;
      }

      try {
        setIsSellerLoading(true);
        setSellerError(null);
        const response = await fetch(`${API_PREFIX}/sellers/${product.sellerId}`);
        if (!response.ok) {
          throw new Error(`Failed to load seller info (${response.status})`);
        }
        const sellerData = await response.json();
        setSellerInfo(sellerData);
      } catch (error: any) {
        console.error("Failed to load seller info:", error);
        setSellerError(error?.message || "Không thể tải thông tin nhà bán hàng");
      } finally {
        setIsSellerLoading(false);
      }
    };

    fetchSellerInfo();
  }, [product?.sellerId]);

  // Build gallery images from mainImage, images, detailImages
  const galleryImages: string[] = (() => {
    if (!product) return [];
    const imgs: string[] = [];
    if (product.mainImage) imgs.push(product.mainImage);
    if (product.images && product.images.length) imgs.push(...product.images.filter(Boolean));
    if (product.detailImages && product.detailImages.length) imgs.push(...product.detailImages.filter(Boolean));
    // Deduplicate while preserving order
    const seen = new Set<string>();
    const unique = imgs.filter((src) => {
      if (seen.has(src)) return false;
      seen.add(src);
      return !!src;
    });
    // Fallback to placeholder if nothing
    return unique.length ? unique : ['/placeholder.svg'];
  })();

  // Load user profile from API
  useEffect(() => {
    const loadProfile = async () => {
      if (!isAuthenticated || !user) return;
      
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        const profileResponse = await fetch('http://localhost:8081/api/user/profile', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (profileResponse.ok) {
          const userData = await profileResponse.json();
          setUserProfile(userData);
        }
      } catch (error) {
        console.error('Failed to load profile:', error);
      }
    };
    
    loadProfile();
  }, [isAuthenticated, user]);

  const getMissingFieldsFromProfile = (userData: any) => {
    const missing: string[] = [];
    if (!userData.firstName || userData.firstName.trim() === '') {
      missing.push('Họ');
    }
    if (!userData.lastName || userData.lastName.trim() === '') {
      missing.push('Tên');
    }
    if (!userData.phoneNumber || userData.phoneNumber.trim() === '') {
      missing.push('Số điện thoại');
    }
    if (!userData.addressStreet || userData.addressStreet.trim() === '') {
      missing.push('Địa chỉ (số nhà, tên đường)');
    }
    if (!userData.addressCity || userData.addressCity.trim() === '') {
      missing.push('Tỉnh/Thành phố');
    }
    if (!userData.addressDistrict || userData.addressDistrict.trim() === '') {
      missing.push('Quận/Huyện');
    }
    if (!userData.addressWard || userData.addressWard.trim() === '') {
      missing.push('Phường/Xã');
    }
    return missing;
  };

  const isProfileComplete = () => {
    if (!userProfile) return false;
    
    return Boolean(
      userProfile.firstName && userProfile.firstName.trim() !== '' &&
      userProfile.lastName && userProfile.lastName.trim() !== '' &&
      userProfile.phoneNumber && userProfile.phoneNumber.trim() !== '' &&
      userProfile.addressStreet && userProfile.addressStreet.trim() !== '' &&
      userProfile.addressWard && userProfile.addressWard.trim() !== '' &&
      userProfile.addressDistrict && userProfile.addressDistrict.trim() !== '' &&
      userProfile.addressCity && userProfile.addressCity.trim() !== ''
    );
  };

  const formatReviewDate = (value?: string | any) => {
    if (!value) return new Date().toISOString().slice(0, 16).replace('T', ' ');
    
    // Xử lý LocalDateTime từ backend (có thể là object hoặc string)
    let date: Date;
    if (typeof value === 'string') {
      date = new Date(value);
    } else if (value && typeof value === 'object') {
      // Nếu là object LocalDateTime từ Java (có format: {year, month, day, hour, minute, second})
      if (value.year !== undefined) {
        date = new Date(value.year, (value.monthValue || value.month || 1) - 1, value.dayOfMonth || value.day || 1, value.hour || 0, value.minute || 0, value.second || 0);
      } else {
        date = new Date(value);
      }
    } else {
      return new Date().toISOString().slice(0, 16).replace('T', ' ');
    }
    
    if (Number.isNaN(date.getTime())) {
      return new Date().toISOString().slice(0, 16).replace('T', ' ');
    }
    
    // Format: YYYY-MM-DD HH:mm
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  };

  const totalReviews = reviews.length || product?.reviewCount || 0;
  const averageRating = reviews.length
    ? Number((reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1))
    : Number((product?.rating || 0).toFixed(1));

  // Tính toán số lượng review theo từng filter
  const reviewCounts = {
    all: reviews.length,
    '5': reviews.filter(r => r.rating === 5).length,
    '4': reviews.filter(r => r.rating === 4).length,
    '3': reviews.filter(r => r.rating === 3).length,
    '2': reviews.filter(r => r.rating === 2).length,
    '1': reviews.filter(r => r.rating === 1).length,
    'with-comment': reviews.filter(r => r.comment && r.comment.trim()).length,
    'with-media': reviews.filter(r => r.images && r.images.length > 0).length,
  };

  // Filter reviews theo filter đã chọn
  const filteredReviews = reviews.filter(review => {
    if (reviewFilter === 'all') return true;
    if (reviewFilter === 'with-comment') return review.comment && review.comment.trim();
    if (reviewFilter === 'with-media') return review.images && review.images.length > 0;
    return review.rating === Number(reviewFilter);
  });

  const sellerDisplayName =
    sellerInfo?.businessName?.trim() ||
    sellerInfo?.contactPerson?.trim() ||
    product?.sellerName ||
    "Nhà bán hàng uy tín";

  const buildWelcomeMessage = (): ChatMessage => ({
    id: "welcome",
    sender: "seller",
    text: `Xin chào! Tôi là ${sellerDisplayName}. Bạn cần hỗ trợ gì thêm về sản phẩm "${product.name}"?`,
    timestamp: new Date(),
  });

  const mapConversationToMessages = (conversation?: ConversationDTO | null): ChatMessage[] => {
    if (!conversation || !conversation.messages || conversation.messages.length === 0) {
      return [buildWelcomeMessage()];
    }
    const sorted = [...conversation.messages].sort(
      (a, b) => (a.timestamp || 0) - (b.timestamp || 0)
    );
    return sorted.map((msg, index) => ({
      id: `${conversation.id}-${msg.timestamp || index}-${index}`,
      sender: msg.role === "seller" ? "seller" : "user",
      text: msg.content,
      timestamp: new Date(msg.timestamp || Date.now()),
    }));
  };

  const syncConversationState = (conversation?: ConversationDTO | null) => {
    if (conversation) {
      setActiveConversation(conversation);
    }
    setChatMessages(mapConversationToMessages(conversation));
  };

  const conversationOrderKey = product?.id || id || undefined;

  const findExistingConversation = (items: ConversationDTO[]): ConversationDTO | undefined => {
    if (!product?.sellerId) return undefined;
    if (conversationOrderKey) {
      const exactMatch = items.find(
        (conv) => conv.sellerId === product.sellerId && conv.orderId === conversationOrderKey
      );
      if (exactMatch) return exactMatch;
    }
    return items.find((conv) => conv.sellerId === product.sellerId);
  };

  const loadConversationHistory = async (): Promise<ConversationDTO | null> => {
    if (!user?.id || !product?.sellerId) return null;
    try {
      setIsLoadingChatHistory(true);
      const customerConversations = await messageService.getConversationsByCustomer(user.id);
      let conversation = findExistingConversation(customerConversations) || null;
      if (!conversation) {
        conversation = await messageService.createConversation({
          sellerId: product.sellerId,
          customerId: user.id,
          orderId: conversationOrderKey || `inquiry-${product.sellerId}`,
        });
      }
      syncConversationState(conversation);
      return conversation;
    } catch (error: any) {
      console.error("Failed to load conversation:", error);
      toast({
        title: "Không thể tải hội thoại",
        description: error?.message || "Vui lòng thử lại sau.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsLoadingChatHistory(false);
    }
  };

  const ensureConversation = async (): Promise<ConversationDTO | null> => {
    if (activeConversation) return activeConversation;
    return loadConversationHistory();
  };

  useEffect(() => {
    if (!product) return;
    setActiveConversation(null);
    setChatMessages([buildWelcomeMessage()]);
  }, [product?.id]);

  useEffect(() => {
    if (!isChatOpen) return;
    if (!user?.id || !product?.sellerId) return;
    loadConversationHistory();
  }, [isChatOpen, user?.id, product?.sellerId]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 py-12 bg-gradient-to-br from-background via-secondary/30 to-accent/10">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-12 mb-12">
              <div className="space-y-6">
                <div className="aspect-square rounded-2xl bg-muted animate-pulse"></div>
                <div className="flex gap-3 justify-center">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="w-24 h-24 bg-muted rounded-xl animate-pulse"></div>
                  ))}
                </div>
              </div>
              <div className="space-y-8">
                <div className="h-32 bg-muted rounded-2xl animate-pulse"></div>
                <div className="h-64 bg-muted rounded-2xl animate-pulse"></div>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 py-12 bg-gradient-to-br from-background via-secondary/30 to-accent/10">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-2xl font-bold text-muted-foreground">Không tìm thấy sản phẩm</h1>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const sellerLocation = [
    sellerInfo?.ward,
    sellerInfo?.district,
    sellerInfo?.city || sellerInfo?.province,
  ]
    .filter(Boolean)
    .join(", ") ||
    sellerInfo?.address ||
    product?.origin ||
    "Việt Nam";

  const sellerEmail =
    sellerInfo?.email || sellerInfo?.contactEmail || sellerInfo?.user?.email;
  const sellerPhone = sellerInfo?.phone || sellerInfo?.contactPhone;

  const formatCompactNumber = (value?: number | null) => {
    if (value === undefined || value === null) return null;
    if (value >= 1_000_000) {
      const formatted = (value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1);
      return `${formatted.endsWith('.0') ? formatted.slice(0, -2) : formatted}m`;
    }
    if (value >= 1_000) {
      const formatted = (value / 1_000).toFixed(value >= 10_000 ? 0 : 1);
      return `${formatted.endsWith('.0') ? formatted.slice(0, -2) : formatted}k`;
    }
    return value.toString();
  };

  const formatMemberSince = (dateString?: string) => {
    if (!dateString) return "Đang cập nhật";
    const parsed = new Date(dateString);
    if (isNaN(parsed.getTime())) return dateString;
    const now = new Date();
    const diffMs = now.getTime() - parsed.getTime();
    if (diffMs <= 0) return "Mới tham gia";

    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays >= 365) {
      const years = Math.floor(diffDays / 365);
      return `${years} năm trước`;
    }
    if (diffDays >= 30) {
      const months = Math.floor(diffDays / 30);
      return `${months} tháng trước`;
    }
    if (diffDays >= 7) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks} tuần trước`;
    }
    return `${diffDays} ngày trước`;
  };

  const sellerOnlineStatus =
    sellerInfo?.onlineStatus ||
    (sellerInfo?.lastActiveHumanized
      ? `Online ${sellerInfo.lastActiveHumanized}`
      : sellerInfo?.isOnline
        ? "Đang hoạt động"
        : "Hoạt động gần đây");

  const sellerStats = [
    {
      label: "Đánh giá",
      value:
        formatCompactNumber(
          sellerInfo?.ratingCount ?? sellerInfo?.reviewCount ?? product.reviewCount
        ) || "Đang cập nhật",
    },
    {
      label: "Tỉ lệ phản hồi",
      value: sellerInfo?.responseRate
        ? `${sellerInfo.responseRate}%`
        : "Đang cập nhật",
    },
    {
      label: "Tham gia",
      value:
        sellerInfo?.memberSinceLabel ||
        formatMemberSince(sellerInfo?.memberSince || sellerInfo?.createdAt),
    },
    {
      label: "Sản phẩm",
      value:
        formatCompactNumber(
          sellerInfo?.productCount ?? sellerInfo?.totalProducts ?? sellerInfo?.products
        ) || "Đang cập nhật",
    },
    {
      label: "Thời gian phản hồi",
      value: sellerInfo?.responseTime || "Đang cập nhật",
    },
    {
      label: "Người theo dõi",
      value:
        formatCompactNumber(
          sellerInfo?.followerCount ?? sellerInfo?.followers ?? sellerInfo?.subscriberCount
        ) || "Đang cập nhật",
    },
  ];

  const sellerShopPath = product?.sellerId ? `/seller/${product.sellerId}` : null;

  const handleOpenChat = () => {
    if (!product?.sellerId) {
      toast({
        title: "Không tìm thấy nhà bán hàng",
        description: "Vui lòng thử lại sau.",
        variant: "destructive",
      });
      return;
    }
    if (!isAuthenticated) {
      toast({
        title: "Vui lòng đăng nhập",
        description: "Bạn cần đăng nhập để trò chuyện với nhà bán hàng.",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }
    setIsChatOpen(true);
  };

  const handleSendChatMessage = async () => {
    if (!chatMessage.trim() || !user?.id) return;

    const conversation = await ensureConversation();
    if (!conversation) {
      return;
    }

    const trimmed = chatMessage.trim();
    const optimisticId = `local-${Date.now()}`;
    const optimisticMessage: ChatMessage = {
      id: optimisticId,
      sender: "user",
      text: trimmed,
      timestamp: new Date(),
    };

    setChatMessages((prev) => [...prev, optimisticMessage]);
    setChatMessage("");
    setIsSendingChat(true);

    const payload: ConversationMessageDTO = {
      senderId: user.id,
      senderName:
        `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
        user.username ||
        "Khách hàng",
      role: "customer",
      content: trimmed,
      timestamp: Date.now(),
    };

    try {
      const updatedConversation = await messageService.sendMessage(conversation.id, payload);
      syncConversationState(updatedConversation);
    } catch (error: any) {
      console.error("Failed to send chat message:", error);
      setChatMessages((prev) => prev.filter((msg) => msg.id !== optimisticId));
      setChatMessage(trimmed);
      toast({
        title: "Gửi tin nhắn thất bại",
        description: error?.message || "Vui lòng thử lại sau.",
        variant: "destructive",
      });
    } finally {
      setIsSendingChat(false);
    }
  };

  const handleChatKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSendChatMessage();
    }
  };

  const formatChatTimestamp = (date: Date) =>
    date.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 py-12 bg-gradient-to-br from-background via-secondary/30 to-accent/10">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 mb-12">
            {/* Product Images */}
            <div className="space-y-6">
              <div className="aspect-square rounded-2xl overflow-hidden bg-gradient-to-br from-muted/50 to-accent/20 p-4 shadow-large">
                <div className="w-full h-full rounded-xl overflow-hidden bg-white/80 backdrop-blur-sm">
                  <img 
                    src={galleryImages[Math.min(selectedImage, galleryImages.length - 1)]} 
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                  />
                </div>
              </div>
              <div className="flex gap-3 justify-center">
                {galleryImages && galleryImages.length > 0 ? (
                  galleryImages.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImage(index)}
                      className={`group aspect-square w-24 rounded-xl overflow-hidden border-2 transition-all duration-300 hover:scale-110 hover:shadow-medium ${
                        selectedImage === index 
                          ? 'border-primary shadow-medium ring-2 ring-primary/20' 
                          : 'border-muted hover:border-accent'
                      }`}
                    >
                      <img 
                        src={image} 
                        alt="" 
                        className="w-full h-full object-cover transition-opacity duration-300 group-hover:opacity-90" 
                      />
                    </button>
                  ))
                ) : (
                  <div className="w-24 h-24 bg-muted rounded-xl flex items-center justify-center">
                    <span className="text-2xl">🛒</span>
                  </div>
                )}
              </div>
            </div>

            {/* Product Info */}
            <div className="space-y-8">
              <div className="bg-card/50 backdrop-blur-sm rounded-2xl p-8 border shadow-soft">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent mb-4">
                  {product.name}
                </h1>
                <div className="flex items-center gap-6 mb-6">
                  <div className="flex items-center gap-2 bg-yellow-50 px-4 py-2 rounded-full">
                    <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    <span className="font-bold text-yellow-600">{product.rating?.toFixed(1) || '0.0'}</span>
                    <span className="text-yellow-600/70">({product.reviewCount || 0} đánh giá)</span>
                  </div>
                  <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-200 px-4 py-2 text-sm font-medium">
                    {product.stock > 0 ? 'Còn hàng' : 'Hết hàng'}
                  </Badge>
                </div>
              </div>

              <div className="bg-gradient-to-r from-primary/5 to-accent/5 rounded-2xl p-8 border border-primary/20">
                <div className="space-y-3">
                  {flashSaleProduct ? (
                    <>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="destructive" className="bg-red-500 text-white animate-pulse">
                          🔥 FLASH SALE
                        </Badge>
                        <Badge variant="destructive" className="bg-red-100 text-red-700 border-red-200">
                          -{Math.round(flashSaleProduct.discountPercentage || 0)}%
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-4xl font-bold bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
                          ₫{flashSaleProduct.flashSalePrice?.toLocaleString() || '0'}
                        </span>
                        <span className="text-xl line-through text-muted-foreground">
                          ₫{flashSaleProduct.originalPrice?.toLocaleString() || product.price?.toLocaleString() || '0'}
                        </span>
                      </div>
                      <p className="text-sm text-red-600 font-semibold">
                        ⚡ Giá flash sale • Còn lại: {flashSaleProduct.remainingStock || (flashSaleProduct.flashSaleStock - flashSaleProduct.soldCount)} sản phẩm
                      </p>
                      <p className="text-muted-foreground font-medium">Đã bao gồm VAT • Giá ưu đãi có giới hạn</p>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <span className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                          ₫{product.price?.toLocaleString() || '0'}
                        </span>
                        {product.originalPrice && product.originalPrice > product.price && (
                          <>
                            <span className="text-xl line-through text-muted-foreground">₫{product.originalPrice.toLocaleString()}</span>
                            <Badge variant="destructive" className="bg-red-100 text-red-700 border-red-200 animate-pulse">
                              -{Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}%
                            </Badge>
                          </>
                        )}
                      </div>
                      <p className="text-muted-foreground font-medium">Đã bao gồm VAT • Giá ưu đãi có giới hạn</p>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-card/30 backdrop-blur-sm rounded-2xl p-6 border">
                  <div className="flex items-center gap-6">
                    <label className="text-lg font-semibold text-foreground">Số lượng:</label>
                    <div className="flex items-center bg-background border-2 border-muted rounded-xl overflow-hidden shadow-soft">
                      <button 
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="px-4 py-3 hover:bg-accent/20 transition-colors duration-200 font-bold text-lg"
                      >
                        -
                      </button>
                      <span className="px-6 py-3 border-x-2 border-muted font-bold text-lg min-w-[60px] text-center bg-muted/20">
                        {quantity}
                      </span>
                      <button 
                        onClick={() => {
                          const maxQty = flashSaleProduct 
                            ? Math.min(
                                flashSaleProduct.maxQuantityPerUser || 999,
                                flashSaleProduct.remainingStock || flashSaleProduct.flashSaleStock || 999
                              )
                            : (product.stock || 999);
                          setQuantity(Math.min(maxQty, quantity + 1));
                        }}
                        className="px-4 py-3 hover:bg-accent/20 transition-colors duration-200 font-bold text-lg"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  {flashSaleProduct && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Tối đa {flashSaleProduct.maxQuantityPerUser || 'không giới hạn'} sản phẩm/người • 
                      Còn lại: {flashSaleProduct.remainingStock || (flashSaleProduct.flashSaleStock - flashSaleProduct.soldCount)} sản phẩm
                    </p>
                  )}
                </div>

                <div className="flex gap-4">
                  <Button 
                    size="lg" 
                    className="flex-1 h-14 text-lg font-semibold bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 shadow-medium hover:shadow-large transition-all duration-300 hover:scale-105"
                    onClick={async () => {
                      if (!isAuthenticated) {
                        window.location.href = '/auth';
                        return;
                      }
                      if (!user || !product?.id) return;
                      try {
                        await cartService.addItem(user.id, product.id, quantity);
                        toast({ title: 'Đã thêm vào giỏ hàng', description: product.name });
                      } catch (e) {
                        console.error('Add to cart failed', e);
                      }
                    }}
                  >
                    <ShoppingCart className="w-6 h-6 mr-3" />
                    Thêm vào giỏ hàng
                  </Button>
                  <Button 
                    variant="outline" 
                    size="lg" 
                    className={`h-14 w-14 border-2 transition-all duration-300 hover:scale-110 ${isAuthenticated && user && product?.id && favoritesService.isFavorite(user.id, product.id) ? 'border-red-300 bg-red-50 text-red-600' : 'hover:border-red-300 hover:bg-red-50 hover:text-red-600'}`}
                    onClick={() => {
                      if (!isAuthenticated || !user || !product?.id) { window.location.href = '/auth'; return; }
                      const now = favoritesService.toggle(user.id, product.id);
                      toast({ title: now ? 'Đã thêm vào yêu thích' : 'Đã xóa khỏi yêu thích', description: product.name });
                    }}
                  >
                    <Heart className="w-6 h-6" />
                  </Button>
                </div>

                <Button 
                  variant="outline" 
                  size="lg" 
                  className="w-full h-14 text-lg font-semibold border-2 border-primary/50 bg-gradient-to-r from-primary/5 to-accent/5 hover:from-primary/10 hover:to-accent/10 hover:border-primary transition-all duration-300 hover:shadow-medium"
                  onClick={async () => {
                    if (!isAuthenticated) { window.location.href = '/auth'; return; }
                    if (!user || !product?.id) return;
                    
                    // Require profile completeness before purchase
                    if (!isProfileComplete()) {
                      const missingFields = userProfile ? getMissingFieldsFromProfile(userProfile) : ['Thông tin cá nhân'];
                      const missingText = missingFields.length > 0 
                        ? `Thiếu: ${missingFields.join(', ')}`
                        : 'Thiếu thông tin cá nhân';
                      
                      toast({ 
                        title: 'Thiếu thông tin cá nhân', 
                        description: `Vui lòng cập nhật ${missingText} trước khi mua hàng.`, 
                        variant: 'destructive'
                      });
                      navigate('/profile?tab=address');
                      return;
                    }
                    try {
                      await cartService.addItem(user.id, product.id, Math.max(1, quantity));
                      navigate('/checkout');
                    } catch (e) {
                      console.error('Buy now failed', e);
                    }
                  }}
                >
                  Mua ngay
                </Button>
              </div>

              <div className="bg-gradient-to-r from-background to-muted/30 rounded-2xl p-6 border border-muted/50 shadow-soft">
                <div className="grid grid-cols-3 gap-6">
                  <div className="text-center group">
                    <div className="w-12 h-12 mx-auto mb-3 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center shadow-medium group-hover:scale-110 transition-transform duration-300">
                      <Truck className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-sm font-bold text-foreground">Giao hàng nhanh</p>
                    <p className="text-xs text-muted-foreground">2-3 ngày</p>
                  </div>
                  <div className="text-center group">
                    <div className="w-12 h-12 mx-auto mb-3 bg-gradient-to-br from-accent to-primary rounded-full flex items-center justify-center shadow-medium group-hover:scale-110 transition-transform duration-300">
                      <Shield className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-sm font-bold text-foreground">Chất lượng đảm bảo</p>
                    <p className="text-xs text-muted-foreground">Hàng chính hãng</p>
                  </div>
                  <div className="text-center group">
                    <div className="w-12 h-12 mx-auto mb-3 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center shadow-medium group-hover:scale-110 transition-transform duration-300">
                      <RotateCcw className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-sm font-bold text-foreground">Đổi trả dễ dàng</p>
                    <p className="text-xs text-muted-foreground">Trong 7 ngày</p>
                  </div>
                </div>
              </div>

            </div>
        </div>

        <div className="w-full mb-12">
          <div className="bg-card rounded-3xl border shadow-soft p-6 md:p-8 flex flex-col gap-8 lg:flex-row lg:items-center w-full">
            <div className="flex items-center gap-5 flex-1 min-w-0">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-3xl font-bold shadow-medium shrink-0">
                {sellerInfo?.logo ? (
                  <img
                    src={sellerInfo.logo}
                    alt={sellerDisplayName}
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  sellerInfo?.businessName?.charAt(0)?.toUpperCase() ||
                  sellerInfo?.contactPerson?.charAt(0)?.toUpperCase() ||
                  product.sellerName?.charAt(0) || (
                    <Store className="w-7 h-7 text-white" />
                  )
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">Nhà bán hàng</p>
                <h3 className="text-2xl font-semibold text-foreground">{sellerDisplayName}</h3>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <Badge variant="outline" className="border-green-300 text-green-600 bg-green-50">
                    {sellerOnlineStatus}
                  </Badge>
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span>{sellerLocation}</span>
                  </p>
                </div>
                <div className="flex flex-wrap gap-3 mt-4">
                  <Button
                    variant="destructive"
                    className="bg-red-500/90 hover:bg-red-500 text-white flex items-center gap-2"
                    onClick={() =>
                      toast({
                        title: "Đã thêm vào danh sách yêu thích",
                        description: sellerDisplayName,
                      })
                    }
                  >
                    <Heart className="w-4 h-4" />
                    Yêu thích+
                  </Button>
                  <Button
                    variant="outline"
                    className="border-primary/50 text-primary hover:bg-primary/10 flex items-center gap-2"
                    onClick={handleOpenChat}
                  >
                    <MessageCircle className="w-4 h-4" />
                    Chat ngay
                  </Button>
                  <Button
                    variant="ghost"
                    className="border text-muted-foreground hover:text-primary flex items-center gap-2"
                    onClick={() => {
                      if (!sellerShopPath) {
                        toast({
                          title: "Chưa có trang shop",
                          description: "Nhà bán hàng chưa kích hoạt trang giới thiệu.",
                        });
                        return;
                      }
                      navigate(sellerShopPath);
                    }}
                  >
                    <Store className="w-4 h-4" />
                    Xem shop
                  </Button>
                </div>
              </div>
            </div>
            <div className="hidden lg:block h-24 w-px bg-border" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-10 gap-y-6 flex-1 w-full">
              {sellerStats.map((stat) => (
                <div key={stat.label} className="text-left">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {stat.label}
                  </p>
                  <p className="text-xl font-semibold text-primary mt-1">
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
          {sellerError && (
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg mt-4">
              {sellerError}
            </p>
          )}
          {isSellerLoading && (
            <p className="text-sm text-muted-foreground mt-4">
              Đang tải thông tin nhà bán hàng...
            </p>
          )}
        </div>

        <Dialog open={isChatOpen} onOpenChange={setIsChatOpen}>
          <DialogContent className="sm:max-w-[520px]">
            <DialogHeader>
              <DialogTitle>Chat với {sellerDisplayName}</DialogTitle>
              <DialogDescription>
                Trao đổi trực tiếp với nhà bán hàng về sản phẩm {product.name}.
              </DialogDescription>
            </DialogHeader>

            <div className="flex items-center gap-4 p-4 rounded-2xl bg-muted/60">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-xl font-bold">
                {sellerInfo?.businessName?.charAt(0)?.toUpperCase() ||
                  sellerInfo?.contactPerson?.charAt(0)?.toUpperCase() ||
                  product.sellerName?.charAt(0) || (
                    <Store className="w-6 h-6 text-white" />
                  )}
              </div>
              <div>
                <p className="font-semibold text-foreground">{sellerDisplayName}</p>
                <p className="text-sm text-muted-foreground">{sellerOnlineStatus}</p>
                {sellerPhone && (
                  <p className="text-sm text-muted-foreground">Hotline: {sellerPhone}</p>
                )}
              </div>
            </div>

            <div className="h-64 overflow-y-auto space-y-3 border border-dashed border-muted rounded-xl p-4 bg-muted/30">
              {isLoadingChatHistory ? (
                <div className="h-full flex items-center justify-center text-muted-foreground gap-2">
                  <Clock className="h-4 w-4 animate-spin" />
                  Đang tải hội thoại...
                </div>
              ) : (
                <>
                  {chatMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex flex-col max-w-[85%] ${
                        message.sender === "user" ? "ml-auto items-end" : "items-start"
                      }`}
                    >
                      <div
                        className={`px-4 py-2 rounded-2xl text-sm ${
                          message.sender === "user"
                            ? "bg-primary text-primary-foreground rounded-br-none"
                            : "bg-background text-foreground rounded-bl-none border"
                        }`}
                      >
                        {message.text}
                      </div>
                      <span className="text-[11px] text-muted-foreground mt-1">
                        {formatChatTimestamp(message.timestamp)}
                      </span>
                    </div>
                  ))}
                  {chatMessages.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center">
                      Hãy là người đầu tiên đặt câu hỏi cho nhà bán hàng!
                    </p>
                  )}
                  {isSendingChat && (
                    <p className="text-xs text-muted-foreground italic">Đang gửi...</p>
                  )}
                </>
              )}
            </div>

            <div className="space-y-3">
              <Textarea
                value={chatMessage}
                onChange={(event) => setChatMessage(event.target.value)}
                placeholder="Nhập câu hỏi hoặc yêu cầu của bạn..."
                rows={3}
                onKeyDown={handleChatKeyDown}
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Nhấn Enter để gửi, Shift + Enter để xuống dòng
                </p>
                <Button
                  onClick={handleSendChatMessage}
                  disabled={!chatMessage.trim() || isSendingChat}
                >
                  Gửi tin nhắn
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Product Details Tabs */}
          <div className="bg-card rounded-xl border shadow-sm mb-8">
            <Tabs defaultValue="description" className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-muted/50 rounded-t-xl h-14">
                <TabsTrigger 
                  value="description" 
                  className="text-base font-medium h-12 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  Mô tả sản phẩm
                </TabsTrigger>
                <TabsTrigger 
                  value="specifications" 
                  className="text-base font-medium h-12 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  Thông số kỹ thuật
                </TabsTrigger>
                <TabsTrigger 
                  value="reviews" 
                  className="text-base font-medium h-12 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  Đánh giá ({totalReviews})
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="description" className="p-8 pt-6">
                <div className="prose prose-sm max-w-none">
                  <h3 className="text-xl font-semibold text-foreground mb-4">Mô tả chi tiết</h3>
                  <p className="text-muted-foreground leading-relaxed text-base">
                    {product.description || 'Chưa có mô tả chi tiết cho sản phẩm này.'}
                  </p>
                  <div className="mt-6 p-4 bg-muted/30 rounded-lg border-l-4 border-primary">
                    <p className="text-sm text-muted-foreground">
                      <strong className="text-foreground">Lưu ý:</strong> Sản phẩm được đóng gói cẩn thận và giao hàng trong vòng 24h tại khu vực nội thành.
                    </p>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="specifications" className="p-8 pt-6">
                <div className="space-y-6">
                  <h3 className="text-2xl font-bold text-foreground">Thông số kỹ thuật</h3>
                  
                  {/* Grid layout cho thông tin kỹ thuật */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Helper function để lấy giá trị từ specifications hoặc các trường riêng lẻ */}
                    {(() => {
                      // Hàm normalize key để so sánh không phân biệt hoa/thường và có dấu
                      const normalizeKey = (key: string): string => {
                        return key.trim().toUpperCase()
                          .normalize('NFD')
                          .replace(/[\u0300-\u036f]/g, '')
                          .replace(/\s+/g, ' ');
                      };

                      // Hàm tìm giá trị trong specifications với key chuẩn hóa
                      const findValueInSpecs = (targetKey: string): any => {
                        if (!product.specifications) return null;
                        
                        const normalizedTarget = normalizeKey(targetKey);
                        
                        // Tìm exact match trước
                        if (product.specifications[targetKey]) {
                          return product.specifications[targetKey];
                        }
                        
                        // Tìm với key chuẩn hóa (không phân biệt hoa/thường, có dấu)
                        for (const [key, value] of Object.entries(product.specifications)) {
                          if (normalizeKey(key) === normalizedTarget) {
                            return value;
                          }
                        }
                        
                        return null;
                      };

                      const getValue = (specKey: string, fallbackValue?: any): string => {
                        // Ưu tiên lấy từ specifications (với normalize)
                        const specValue = findValueInSpecs(specKey);
                        if (specValue !== null && specValue !== undefined && specValue !== '') {
                          return String(specValue);
                        }
                        
                        // Fallback về các trường riêng lẻ
                        if (fallbackValue !== undefined && fallbackValue !== null && fallbackValue !== '') {
                          return String(fallbackValue);
                        }
                        
                        // Nếu không có giá trị, trả về "-"
                        return '-';
                      };

                      // Danh sách các trường chuẩn luôn hiển thị
                      const standardFields = [
                        { key: 'KÍCH THƯỚC', fallback: product.dimensions, colSpan: false },
                        { key: 'THÀNH PHẦN', fallback: product.ingredients, colSpan: true },
                        { key: 'THƯƠNG HIỆU', fallback: product.brand, colSpan: false },
                        { key: 'TRỌNG LƯỢNG', fallback: product.weight, colSpan: false },
                        { key: 'ĐƠN VỊ', fallback: product.unit, colSpan: false },
                        { key: 'XUẤT XỨ', fallback: product.origin, colSpan: false },
                        { key: 'HẠN SỬ DỤNG', fallback: product.expiryDate, colSpan: false },
                        { key: 'BẢO QUẢN', fallback: (product.storage || (product as any).storageInstructions), colSpan: false },
                      ];

                      return standardFields.map((field) => (
                        <div 
                          key={field.key} 
                          className={`bg-gradient-to-br from-background to-muted/30 border border-border rounded-lg p-4 hover:shadow-md transition-all duration-200 ${field.colSpan ? 'md:col-span-2' : ''}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">{field.key}</span>
                            <span className="text-base font-semibold text-foreground text-right flex-1">{getValue(field.key, field.fallback)}</span>
                          </div>
                        </div>
                      ));
                    })()}
                    
                    {/* Hiển thị các trường khác từ specifications (không phải trường chuẩn) */}
                    {(() => {
                      const normalizeKeyForFilter = (key: string): string => {
                        return key.trim().toUpperCase()
                          .normalize('NFD')
                          .replace(/[\u0300-\u036f]/g, '')
                          .replace(/\s+/g, ' ');
                      };

                      const standardKeys = ['KÍCH THƯỚC', 'THÀNH PHẦN', 'THƯƠNG HIỆU', 'TRỌNG LƯỢNG', 'ĐƠN VỊ', 'XUẤT XỨ', 'HẠN SỬ DỤNG', 'BẢO QUẢN'].map(k => normalizeKeyForFilter(k));

                      if (product.specifications && Object.keys(product.specifications).length > 0) {
                        return Object.entries(product.specifications)
                          .filter(([key]) => {
                            const normalizedKey = normalizeKeyForFilter(key);
                            return !standardKeys.includes(normalizedKey);
                          })
                          .map(([key, value]) => (
                            <div key={key} className="bg-gradient-to-br from-background to-muted/30 border border-border rounded-lg p-4 hover:shadow-md transition-all duration-200">
                              <div className="flex items-start justify-between gap-3">
                                <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">{key}</span>
                                <span className="text-base font-semibold text-foreground text-right flex-1">{value && value !== '' && value !== null && value !== undefined ? String(value) : '-'}</span>
                              </div>
                            </div>
                          ));
                      }
                      return null;
                    })()}
                  </div>
                  
                  {/* Thông tin bổ sung - Luôn hiển thị */}
                  <div className="mt-6 pt-6 border-t border-border">
                    <h4 className="text-lg font-semibold text-foreground mb-4">Thông tin bổ sung</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-muted/30 border border-border rounded-lg p-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Danh mục</span>
                          <span className="text-base font-semibold text-foreground">{product.category || '-'}</span>
                        </div>
                      </div>
                      <div className="bg-muted/30 border border-border rounded-lg p-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Số lượng tồn kho</span>
                          <span className="text-base font-semibold text-foreground">{product.stock !== undefined && product.stock !== null ? product.stock : '-'}</span>
                        </div>
                      </div>
                      <div className="bg-muted/30 border border-border rounded-lg p-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Trạng thái</span>
                          <span className="text-base font-semibold text-foreground capitalize">{product.status || 'Active'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                </div>
              </TabsContent>
              
              <TabsContent value="reviews" className="p-8 pt-6">
                <div>
                  {/* Header với rating tổng thể */}
                  <div className="mb-6">
                    <h3 className="text-2xl font-bold text-foreground mb-4">ĐÁNH GIÁ SẢN PHẨM</h3>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-6 h-6 ${
                                star <= Math.round(averageRating) ? "fill-red-500 text-red-500" : "text-gray-300"
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-2xl font-bold text-foreground ml-2">
                          {averageRating.toFixed(1)} trên 5
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Filter tabs */}
                  <div className="flex flex-wrap gap-2 mb-6 pb-4 border-b">
                    <Button
                      variant={reviewFilter === 'all' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setReviewFilter('all')}
                      className={reviewFilter === 'all' ? 'bg-primary text-white' : ''}
                    >
                      Tất Cả ({reviewCounts.all})
                    </Button>
                    <Button
                      variant={reviewFilter === '5' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setReviewFilter('5')}
                      className={reviewFilter === '5' ? 'bg-primary text-white' : ''}
                    >
                      5 Sao ({reviewCounts['5']})
                    </Button>
                    <Button
                      variant={reviewFilter === '4' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setReviewFilter('4')}
                      className={reviewFilter === '4' ? 'bg-primary text-white' : ''}
                    >
                      4 Sao ({reviewCounts['4']})
                    </Button>
                    <Button
                      variant={reviewFilter === '3' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setReviewFilter('3')}
                      className={reviewFilter === '3' ? 'bg-primary text-white' : ''}
                    >
                      3 Sao ({reviewCounts['3']})
                    </Button>
                    <Button
                      variant={reviewFilter === '2' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setReviewFilter('2')}
                      className={reviewFilter === '2' ? 'bg-primary text-white' : ''}
                    >
                      2 Sao ({reviewCounts['2']})
                    </Button>
                    <Button
                      variant={reviewFilter === '1' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setReviewFilter('1')}
                      className={reviewFilter === '1' ? 'bg-primary text-white' : ''}
                    >
                      1 Sao ({reviewCounts['1']})
                    </Button>
                    <Button
                      variant={reviewFilter === 'with-comment' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setReviewFilter('with-comment')}
                      className={reviewFilter === 'with-comment' ? 'bg-primary text-white' : ''}
                    >
                      Có Bình Luận ({reviewCounts['with-comment']})
                    </Button>
                    <Button
                      variant={reviewFilter === 'with-media' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setReviewFilter('with-media')}
                      className={reviewFilter === 'with-media' ? 'bg-primary text-white' : ''}
                    >
                      Có Hình Ảnh / Video ({reviewCounts['with-media']})
                    </Button>
                  </div>
                  
                  {isLoadingReviews ? (
                    <div className="py-12 text-center text-muted-foreground">
                      <Clock className="h-8 w-8 mx-auto mb-2 animate-spin" />
                      Đang tải đánh giá...
                    </div>
                  ) : filteredReviews.length > 0 ? (
                    <div className="space-y-6">
                      {filteredReviews.map((review) => {
                        // Mask username (giữ 1 ký tự đầu, ẩn phần còn lại)
                        const maskUsername = (username?: string) => {
                          if (!username) return "n*****";
                          if (username.length <= 1) return username + "*****";
                          return username.charAt(0) + "*****" + username.slice(-1);
                        };

                        return (
                          <div key={review.id} className="border-b pb-6 last:border-b-0">
                            <div className="flex items-start gap-3">
                              {/* Avatar */}
                              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-gray-600 text-sm font-medium">
                                  {(review.userName || "N").charAt(0).toUpperCase()}
                                </span>
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                {/* Username và rating */}
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="font-medium text-foreground text-sm">
                                    {maskUsername(review.userName)}
                                  </span>
                                  <div className="flex">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <Star
                                        key={star}
                                        className={`w-4 h-4 ${
                                          star <= review.rating ? "fill-red-500 text-red-500" : "text-gray-300"
                                        }`}
                                      />
                                    ))}
                                  </div>
                                </div>

                                {/* Timestamp */}
                                <div className="text-xs text-muted-foreground mb-2">
                                  {formatReviewDate(review.createdAt)}
                                  {review.isVerified && (
                                    <span className="ml-2 text-green-600">• Đã mua hàng</span>
                                  )}
                                </div>

                                {/* Comment */}
                                {review.comment && review.comment.trim() && (
                                  <p className="text-sm text-foreground leading-relaxed mb-3">
                                    {review.comment}
                                  </p>
                                )}

                                {/* Media (Images/Video) */}
                                {review.images && review.images.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mb-3">
                                    {review.images.slice(0, 4).map((img, idx) => (
                                      <div
                                        key={idx}
                                        className="w-20 h-20 rounded border overflow-hidden bg-muted cursor-pointer hover:opacity-80 transition-opacity"
                                      >
                                        <img
                                          src={img}
                                          alt={`Review image ${idx + 1}`}
                                          className="w-full h-full object-cover"
                                        />
                                      </div>
                                    ))}
                                    {review.images.length > 4 && (
                                      <div className="w-20 h-20 rounded border bg-muted flex items-center justify-center text-xs text-muted-foreground">
                                        +{review.images.length - 4}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Engagement (Likes) */}
                                <div className="flex items-center gap-4 mt-3">
                                  <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors">
                                    <ThumbsUp className="w-4 h-4" />
                                    <span>{review.helpfulCount || 0}</span>
                                  </button>
                                  <button className="text-muted-foreground hover:text-foreground transition-colors">
                                    <MoreVertical className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground bg-muted/10 rounded-xl border border-dashed">
                      <p>Chưa có đánh giá nào cho sản phẩm này.</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ProductDetail;