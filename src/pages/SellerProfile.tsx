import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Heart,
  MessageCircle,
  Store,
  Star,
  Package,
  Users,
  Clock,
  MapPin,
  Phone,
  Mail,
  TrendingUp,
  CheckCircle,
  Gift,
  ShoppingBag,
  Eye,
  Share2,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { productService } from "@/services/productService";
import { adminService } from "@/services/adminService";

// Use same API base URL as Header component for consistency
const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || '';
const API_PREFIX = API_BASE_URL ? `${API_BASE_URL}/api` : "/api";

const SellerProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  
  const [sellerInfo, setSellerInfo] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("browse");
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    const loadSellerData = async () => {
      if (!id) return;
      
      try {
        setIsLoading(true);
        
        // Try multiple ways to load seller info
        let sellerData = null;
        
        // Method 1: Try check endpoint first (most reliable)
        // This endpoint returns seller info if user is seller
        try {
          const checkResponse = await fetch(`${API_PREFIX}/sellers/check/${id}`);
          if (checkResponse.ok) {
            const checkData = await checkResponse.json();
            console.log("Check response:", checkData);
            
            // If check returns seller object, use it
            if (checkData.seller) {
              sellerData = checkData.seller;
              console.log("Seller data (from check.seller):", sellerData);
            } 
            // If check returns seller ID, fetch seller info
            else if (checkData.sellerId) {
              const actualSellerId = checkData.sellerId;
              const sellerResponse = await fetch(`${API_PREFIX}/sellers/${actualSellerId}`);
              if (sellerResponse.ok) {
                sellerData = await sellerResponse.json();
                console.log("Seller data (from check.sellerId):", sellerData);
              }
            }
            // If check says user is seller but no seller object, id might be seller ID
            else if (checkData.isSeller === true) {
              // Try using id as seller ID
              const sellerResponse = await fetch(`${API_PREFIX}/sellers/${id}`);
              if (sellerResponse.ok) {
                sellerData = await sellerResponse.json();
                console.log("Seller data (id as seller ID):", sellerData);
              }
            }
          } else {
            console.warn("Check endpoint failed:", checkResponse.status);
          }
        } catch (e) {
          console.warn("Error with check endpoint:", e);
        }
        
        // Method 2: Try direct seller ID (if id is seller ID)
        if (!sellerData) {
          try {
            const sellerResponse = await fetch(`${API_PREFIX}/sellers/${id}`);
            if (sellerResponse.ok) {
              sellerData = await sellerResponse.json();
              console.log("Seller data (direct ID):", sellerData);
            } else {
              console.warn("Failed to load seller by ID:", sellerResponse.status);
            }
          } catch (e) {
            console.warn("Error fetching seller by ID:", e);
          }
        }
        
        // Method 3: Try by user ID (if id is user ID)
        if (!sellerData) {
          try {
            const sellerByUserResponse = await fetch(`${API_PREFIX}/sellers/user/${id}`);
            if (sellerByUserResponse.ok) {
              sellerData = await sellerByUserResponse.json();
              console.log("Seller data (by user ID):", sellerData);
            } else {
              console.warn("Failed to load seller by user ID:", sellerByUserResponse.status);
            }
          } catch (e) {
            console.warn("Error fetching seller by user ID:", e);
          }
        }
        
        if (sellerData) {
          setSellerInfo(sellerData);
        } else {
          console.error("Could not load seller data with any method for ID:", id);
          // Set empty seller info to show "not found" message
          setSellerInfo(null);
        }

        // Load seller products - thử nhiều endpoint
        let productList: any[] = [];
        
        // Thử endpoint với pagination
        try {
          const productsResponse = await fetch(`${API_PREFIX}/products/seller/${id}?page=0&size=100`);
          if (productsResponse.ok) {
            const productsData = await productsResponse.json();
            console.log("Products response (pagination):", productsData);
            
            // Xử lý cả PageResponse và array trực tiếp
            if (Array.isArray(productsData)) {
              productList = productsData;
            } else if (productsData.content && Array.isArray(productsData.content)) {
              productList = productsData.content;
            } else if (productsData.data && Array.isArray(productsData.data)) {
              productList = productsData.data;
            } else if (productsData.products && Array.isArray(productsData.products)) {
              productList = productsData.products;
            }
          } else {
            console.warn("Pagination endpoint failed:", productsResponse.status);
          }
        } catch (e) {
          console.warn("Error fetching with pagination:", e);
        }
        
        // Nếu chưa có data, thử endpoint không pagination
        if (productList.length === 0) {
          try {
            const productsResponse2 = await fetch(`${API_PREFIX}/products/seller/${id}`);
            if (productsResponse2.ok) {
              const productsData2 = await productsResponse2.json();
              console.log("Products response (no pagination):", productsData2);
              
              if (Array.isArray(productsData2)) {
                productList = productsData2;
              } else if (productsData2.content && Array.isArray(productsData2.content)) {
                productList = productsData2.content;
              } else if (productsData2.data && Array.isArray(productsData2.data)) {
                productList = productsData2.data;
              } else if (productsData2.products && Array.isArray(productsData2.products)) {
                productList = productsData2.products;
              }
            } else {
              console.warn("No pagination endpoint failed:", productsResponse2.status);
            }
          } catch (e) {
            console.warn("Error fetching without pagination:", e);
          }
        }
        
        // Nếu vẫn chưa có, thử dùng productService
        if (productList.length === 0) {
          try {
            const allProducts = await productService.getProducts();
            console.log("All products from service:", allProducts);
            
            const productArray = Array.isArray(allProducts) 
              ? allProducts 
              : (allProducts.content || []);
            
            productList = productArray.filter((p: any) => 
              p.sellerId === id || 
              p.seller?.id === id ||
              String(p.sellerId) === String(id)
            );
            console.log("Filtered products by sellerId:", productList);
          } catch (e) {
            console.warn("Error using productService:", e);
          }
        }
        
        // Lọc sản phẩm - lấy tất cả nếu không có filter, hoặc lọc theo status
        const filteredProducts = productList.length > 0
          ? productList.filter((p: any) => {
              // Nếu không có status/approvalStatus, lấy tất cả
              if (!p.status && !p.approvalStatus) return true;
              // Nếu có, lấy active/approved/pending (có thể hiển thị pending để seller thấy)
              const status = String(p.status || '').toLowerCase();
              const approvalStatus = String(p.approvalStatus || '').toLowerCase();
              return status === 'active' || 
                     status === 'approved' || 
                     approvalStatus === 'approved' ||
                     approvalStatus === 'pending' ||
                     !status; // Nếu status rỗng, vẫn hiển thị
            })
          : [];
        
        console.log("Final filtered products count:", filteredProducts.length);
        console.log("Final filtered products:", filteredProducts);
        setProducts(filteredProducts);
      } catch (error) {
        console.error("Error loading seller data:", error);
        toast({
          title: "Lỗi",
          description: "Không thể tải thông tin nhà bán hàng",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadSellerData();
  }, [id]);

  const sellerDisplayName =
    sellerInfo?.businessName?.trim() ||
    sellerInfo?.contactPerson?.trim() ||
    sellerInfo?.sellerName ||
    "Nhà bán hàng";

  const sellerLocation = [
    sellerInfo?.ward,
    sellerInfo?.district,
    sellerInfo?.city || sellerInfo?.province,
  ]
    .filter(Boolean)
    .join(", ") ||
    sellerInfo?.address ||
    "Việt Nam";

  const formatCompactNumber = (value?: number | null) => {
    if (value === undefined || value === null) return "0";
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

  const handleFollow = () => {
    if (!isAuthenticated) {
      toast({
        title: "Vui lòng đăng nhập",
        description: "Bạn cần đăng nhập để theo dõi nhà bán hàng",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }
    setIsFollowing(!isFollowing);
    toast({
      title: isFollowing ? "Đã bỏ theo dõi" : "Đã theo dõi",
      description: sellerDisplayName,
    });
  };

  const handleFavorite = () => {
    if (!isAuthenticated) {
      toast({
        title: "Vui lòng đăng nhập",
        description: "Bạn cần đăng nhập để yêu thích shop",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }
    setIsFavorite(!isFavorite);
    toast({
      title: isFavorite ? "Đã bỏ yêu thích" : "Đã yêu thích",
      description: sellerDisplayName,
    });
  };

  const handleChat = () => {
    if (!isAuthenticated) {
      toast({
        title: "Vui lòng đăng nhập",
        description: "Bạn cần đăng nhập để chat với nhà bán hàng",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }
    navigate(`/contact?seller=${id}`);
  };

  const categories = [
    { id: "browse", label: "Dạo" },
    { id: "products", label: "Sản phẩm" },
    ...(sellerInfo?.categories || []).slice(0, 4),
  ];

  // Mock vouchers - có thể fetch từ API sau
  const vouchers = [
    {
      id: 1,
      discount: "3k₫",
      minOrder: "120k₫",
      used: 96,
      expiry: "31.12.2025",
      quantity: 1,
    },
    {
      id: 2,
      discount: "3k₫",
      minOrder: "120k₫",
      used: 0,
      expiry: "31.12.2025",
      quantity: 5,
    },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 py-8">
          <div className="container mx-auto px-4">
            <div className="animate-pulse space-y-6">
              <div className="h-32 bg-muted rounded-lg"></div>
              <div className="h-12 bg-muted rounded-lg"></div>
              <div className="h-64 bg-muted rounded-lg"></div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!sellerInfo) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 py-8">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-2xl font-bold text-muted-foreground">
              Không tìm thấy nhà bán hàng
            </h1>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 py-6">
        <div className="container mx-auto px-4 max-w-7xl">
          {/* Seller Profile Header */}
          <Card className="mb-6 border-2">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                {/* Profile Section */}
                <div className="flex items-center gap-4 flex-1">
                  <div className="relative">
                    <Avatar className="w-20 h-20 border-4 border-background shadow-lg">
                      <AvatarImage 
                        src={sellerInfo.logo || sellerInfo.avatar} 
                        alt={sellerDisplayName}
                      />
                      <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white text-2xl font-bold">
                        {sellerDisplayName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {sellerInfo.isOnline && (
                      <div className="absolute bottom-0 right-0 w-5 h-5 bg-green-500 border-2 border-background rounded-full"></div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h1 className="text-2xl font-bold">{sellerDisplayName}</h1>
                      <Badge 
                        variant="destructive" 
                        className="cursor-pointer"
                        onClick={handleFavorite}
                      >
                        <Heart className={`w-3 h-3 mr-1 ${isFavorite ? 'fill-current' : ''}`} />
                        Yêu Thích
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground flex items-center gap-2 mb-1">
                      <Clock className="w-4 h-4" />
                      {sellerInfo.isOnline 
                        ? "Đang hoạt động" 
                        : sellerInfo.lastActive 
                          ? `Online ${sellerInfo.lastActive}` 
                          : "Hoạt động gần đây"}
                    </p>
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      {sellerLocation}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <Button
                    variant={isFollowing ? "outline" : "default"}
                    className="bg-foreground text-background hover:bg-foreground/90"
                    onClick={handleFollow}
                  >
                    {isFollowing ? "Đã theo dõi" : "+ Theo Dõi"}
                  </Button>
                  <Button
                    variant="outline"
                    className="border-foreground text-foreground hover:bg-foreground hover:text-background"
                    onClick={handleChat}
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Chat
                  </Button>
                </div>
              </div>

              {/* Statistics */}
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mt-6 pt-6 border-t">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Sản Phẩm</p>
                  <p className="text-lg font-bold">{products.length}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Đang Theo</p>
                  <p className="text-lg font-bold">
                    {sellerInfo.followingCount ?? sellerInfo.totalFollowing ?? 0}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Người Theo Dõi</p>
                  <p className="text-lg font-bold">
                    {formatCompactNumber(
                      sellerInfo.followerCount ?? 
                      sellerInfo.followers ?? 
                      sellerInfo.totalFollowers ?? 
                      0
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Tỉ Lệ Phản Hồi Chat</p>
                  <p className="text-lg font-bold">
                    {sellerInfo.responseRate ?? sellerInfo.chatResponseRate ?? 100}%
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ({sellerInfo.responseTime ?? sellerInfo.chatResponseTime ?? "Trong Vài Giờ"})
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Đánh Giá</p>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <p className="text-lg font-bold">
                      {sellerInfo.rating?.toFixed(1) ?? 
                       sellerInfo.averageRating?.toFixed(1) ?? 
                       "0.0"}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    ({formatCompactNumber(
                      sellerInfo.reviewCount ?? 
                      sellerInfo.totalReviews ?? 
                      sellerInfo.ratingCount ??
                      0
                    )} Đánh Giá)
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Tham Gia</p>
                  <p className="text-lg font-bold">
                    {formatMemberSince(
                      sellerInfo.createdAt ?? 
                      sellerInfo.memberSince ?? 
                      sellerInfo.registrationDate
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Navigation Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
            <TabsList className="w-full justify-start bg-muted/50 h-12">
              {categories.map((cat) => (
                <TabsTrigger
                  key={cat.id}
                  value={cat.id}
                  className="data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary"
                >
                  {cat.label}
                </TabsTrigger>
              ))}
              <TabsTrigger value="more" className="ml-auto">
                Thêm ▾
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Voucher Section */}
          <Card className="mb-6 border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">VOUCHER</h2>
                <Button variant="ghost" size="sm">
                  Xem tất cả
                </Button>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {vouchers.map((voucher) => (
                  <Card key={voucher.id} className="border-2 border-dashed">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Gift className="w-5 h-5 text-primary" />
                            <span className="font-bold text-lg text-primary">
                              Giảm {voucher.discount}
                            </span>
                            {voucher.quantity > 1 && (
                              <Badge variant="destructive" className="ml-2">
                                x{voucher.quantity}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            Đơn Tối Thiểu {voucher.minOrder}
                          </p>
                          {voucher.used > 0 && (
                            <div className="mb-2">
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span>Đã dùng</span>
                                <span>{voucher.used}%</span>
                              </div>
                              <div className="w-full bg-muted rounded-full h-2">
                                <div
                                  className="bg-primary h-2 rounded-full"
                                  style={{ width: `${voucher.used}%` }}
                                ></div>
                              </div>
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground">
                            HSD: {voucher.expiry}
                          </p>
                        </div>
                        <Button variant="destructive" size="sm" className="ml-4">
                          Lưu
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Products Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">GỢI Ý CHO BẠN</h2>
              <Button variant="ghost" size="sm">
                Xem Tất Cả &gt;
              </Button>
            </div>
            {products.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Chưa có sản phẩm nào</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {products.slice(0, 12).map((product) => (
                  <Card
                    key={product.id}
                    className="group cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => navigate(`/product/${product.id}`)}
                  >
                    <CardContent className="p-0">
                      <div className="relative aspect-square overflow-hidden rounded-t-lg">
                        <img
                          src={product.mainImage || product.images?.[0] || "/placeholder.svg"}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute top-2 right-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 bg-background/80 hover:bg-background"
                            onClick={(e) => {
                              e.stopPropagation();
                              toast({ title: "Đã thêm vào yêu thích" });
                            }}
                          >
                            <Heart className="w-4 h-4" />
                          </Button>
                        </div>
                        {product.videoUrl && (
                          <div className="absolute bottom-2 left-2">
                            <Badge variant="secondary" className="bg-black/50 text-white">
                              ▶
                            </Badge>
                          </div>
                        )}
                      </div>
                      <div className="p-3 space-y-2">
                        <h3 className="text-sm font-medium line-clamp-2 min-h-[2.5rem]">
                          {product.name}
                        </h3>
                        <div className="flex items-center gap-2">
                          <span className="text-base font-bold text-primary">
                            ₫{product.price?.toLocaleString() || "0"}
                          </span>
                          {product.originalPrice && product.originalPrice > product.price && (
                            <>
                              <span className="text-xs line-through text-muted-foreground">
                                ₫{product.originalPrice.toLocaleString()}
                              </span>
                              <Badge variant="destructive" className="text-xs">
                                -{Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}%
                              </Badge>
                            </>
                          )}
                        </div>
                        {product.promotion && (
                          <div className="flex flex-wrap gap-1">
                            {product.promotion.includes("SHOPEE") && (
                              <Badge variant="outline" className="text-xs border-orange-500 text-orange-500">
                                SHOPEE SIÊU RẺ
                              </Badge>
                            )}
                            {product.promotion.includes("Giảm") && (
                              <Badge variant="outline" className="text-xs">
                                {product.promotion}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default SellerProfile;

