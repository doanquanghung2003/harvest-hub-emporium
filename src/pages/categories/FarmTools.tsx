import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Heart, ShoppingCart, Star, Grid, List, Search, Filter } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { productService } from "@/services/productService";
import { Product } from "@/types/product";
import { useAuth } from "@/hooks/useAuth";
import { cartService } from "@/services/cartService";
import { favoritesService } from "@/services/favoritesService";
import { useToast } from "@/hooks/use-toast";
import { usePagination } from "@/hooks/usePagination";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { isProductInCategory } from "@/utils/categoryMatcher";
import { getRegionFromCity } from "@/utils/regionMapper";

const FarmTools = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [wishVersion, setWishVersion] = useState(0);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [priceRange, setPriceRange] = useState([0, 50000000]);
  const [searchTerm, setSearchTerm] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<string>("relevance");
  const [selectedRatings, setSelectedRatings] = useState<number[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [sellerInfo, setSellerInfo] = useState<Record<string, { name: string; location?: string }>>({});
  const maxPrice = 50000000;

  const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || '';
  const API_PREFIX = API_BASE_URL ? `${API_BASE_URL}/api` : "/api";

  // Pagination
  const {
    currentPage,
    totalPages,
    paginatedItems: paginatedProducts,
    goToPage,
  } = usePagination(filteredProducts, { itemsPerPage: 9 });

  // Reset to page 1 when filters change
  useEffect(() => {
    if (currentPage > 1) {
      goToPage(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, priceRange.join(','), sortBy, selectedRatings.join(','), selectedRegions.join(',')]);

  useEffect(() => {
    const onUpdate = () => setWishVersion(v => v + 1);
    window.addEventListener('wishlist:updated', onUpdate as any);
    return () => window.removeEventListener('wishlist:updated', onUpdate as any);
  }, []);

  // Mock data fallback
  const fallbackFarmTools = [
    {
      id: 1,
      name: "Máy cày mini 7HP",
      price: 4500000,
      originalPrice: 5000000,
      images: ["https://images.unsplash.com/photo-1544652478-6653e09f18a2?w=300"],
      rating: 4.8,
      reviewCount: 45,
      sellerName: "Máy nông nghiệp Việt",
      description: "Máy cày mini công suất 7HP, phù hợp đất ruộng nhỏ",
      category: "Máy móc"
    },
    {
      id: 2,
      name: "Cuốc xới đất cán gỗ",
      price: 150000,
      originalPrice: null,
      images: ["https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=300"],
      rating: 4.6,
      reviewCount: 234,
      sellerName: "Dụng cụ nông nghiệp",
      description: "Cuốc xới đất chất lượng cao, cán gỗ bền chắc",
      category: "Dụng cụ cầm tay"
    },
    {
      id: 3,
      name: "Máy phun thuốc điện",
      price: 1200000,
      originalPrice: 1400000,
      images: ["https://images.unsplash.com/photo-1592982889394-9b1d16f2c71d?w=300"],
      rating: 4.7,
      reviewCount: 89,
      sellerName: "Thiết bị phun thuốc",
      description: "Máy phun thuốc điện 16L, pin lithium bền bỉ",
      category: "Máy phun"
    },
    {
      id: 4,
      name: "Máy cắt cỏ cầm tay",
      price: 800000,
      originalPrice: null,
      images: ["https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300"],
      rating: 4.5,
      reviewCount: 178,
      sellerName: "Máy cắt cỏ Nhật",
      description: "Máy cắt cỏ cầm tay, động cơ 2 thì mạnh mẽ",
      category: "Máy cắt"
    },
    {
      id: 5,
      name: "Giỏ thu hoạch rau củ",
      price: 80000,
      originalPrice: 100000,
      images: ["https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=300"],
      rating: 4.4,
      reviewCount: 356,
      sellerName: "Dụng cụ thu hoạch",
      description: "Giỏ nhựa PE chuyên dụng thu hoạch rau củ",
      category: "Dụng cụ thu hoạch"
    },
    {
      id: 6,
      name: "Máy bơm nước 1HP",
      price: 2200000,
      originalPrice: null,
      images: ["https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?w=300"],
      rating: 4.9,
      reviewCount: 67,
      sellerName: "Máy bơm Việt Nam",
      description: "Máy bơm nước ly tâm 1HP, phù hợp tưới tiêu",
      category: "Máy bơm"
    }
  ];

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setIsLoading(true);
        const allProducts = await productService.getProducts();
        
        // Filter only farm tools using consistent category matcher
        const toolProducts = allProducts.filter(product => {
          const matchesNongNghiep = isProductInCategory(product.category, 'Dụng cụ nông nghiệp');
          const matchesNongSan = isProductInCategory(product.category, 'Dụng cụ nông sản');
          
          const productNameLower = product.name?.toLowerCase() || '';
          const hasToolKeywords = productNameLower.includes('máy') ||
            productNameLower.includes('cuốc') ||
            productNameLower.includes('xẻng') ||
            productNameLower.includes('dụng cụ');
          
          return matchesNongNghiep || matchesNongSan || hasToolKeywords;
        });

        if (toolProducts.length > 0) {
          setProducts(toolProducts);
          setFilteredProducts(toolProducts);
        } else {
          console.warn('No farm tools found in DB, using fallback data');
          setProducts(fallbackFarmTools as any);
          setFilteredProducts(fallbackFarmTools as any);
        }
      } catch (error) {
        console.error('Error loading farm tools:', error);
        setProducts(fallbackFarmTools as any);
        setFilteredProducts(fallbackFarmTools as any);
      } finally {
        setIsLoading(false);
      }
    };

    loadProducts();
  }, []);

  // Fetch seller info for all products
  useEffect(() => {
    const fetchSellerInfo = async () => {
      const productList = products.length > 0 ? products : filteredProducts;
      const uniqueSellerIds = Array.from(
        new Set(
          productList
            .map((product) => product.sellerId?.trim())
            .filter((id): id is string => !!id && !sellerInfo[id])
        )
      );

      if (uniqueSellerIds.length === 0) return;

      try {
        const sellerResponses = await Promise.all(
          uniqueSellerIds.map(async (sellerId) => {
            try {
              const response = await fetch(`${API_PREFIX}/sellers/${sellerId}`);
              if (!response.ok) {
                throw new Error(`Failed to load seller ${sellerId}`);
              }
              const seller = await response.json();
              
              // Only use city/province for location (not ward, district)
              const location = seller.city || seller.province || undefined;

              return {
                sellerId,
                info: {
                  name: seller.businessName?.trim() || seller.contactPerson?.trim() || seller.user?.fullName || "Nông trại đối tác",
                  location: location || "Việt Nam",
                },
              };
            } catch (error) {
              console.warn("Không thể tải thông tin seller", sellerId, error);
              return null;
            }
          })
        );

        const infoUpdates: Record<string, { name: string; location?: string }> = {};
        sellerResponses.forEach((result) => {
          if (result && result.info?.name) {
            infoUpdates[result.sellerId] = result.info;
          }
        });

        if (Object.keys(infoUpdates).length > 0) {
          setSellerInfo((prev) => ({
            ...prev,
            ...infoUpdates,
          }));
        }
      } catch (error) {
        console.error("Error fetching seller info:", error);
      }
    };

    fetchSellerInfo();
  }, [products, filteredProducts]);

  // Filter and sort products based on search, price range, rating, region, and sort option
  useEffect(() => {
    let filtered = products;

    if (searchTerm) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    filtered = filtered.filter(product => {
      const price = product.price || 0;
      return price >= priceRange[0] && price <= priceRange[1];
    });

    // Rating filter
    if (selectedRatings.length > 0) {
      const minRating = Math.min(...selectedRatings);
      filtered = filtered.filter(product => (product.rating || 0) >= minRating);
    }

    // Region filter - filter by seller's city location
    if (selectedRegions.length > 0) {
      filtered = filtered.filter(product => {
        const sellerLocation = product.sellerId && sellerInfo[product.sellerId] 
          ? sellerInfo[product.sellerId].location 
          : undefined;
        const productRegion = getRegionFromCity(sellerLocation);
        return selectedRegions.includes(productRegion);
      });
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "price-low":
          return (a.price || 0) - (b.price || 0);
        case "price-high":
          return (b.price || 0) - (a.price || 0);
        case "rating":
          return (b.rating || 0) - (a.rating || 0);
        case "newest":
          // Assuming products have an id that represents newness, or use a date field if available
          return (b.id || 0) - (a.id || 0);
        case "relevance":
        default:
          // Default: keep original order (relevance)
          return 0;
      }
    });

    setFilteredProducts(sorted);
  }, [products, searchTerm, priceRange, sortBy, selectedRatings, selectedRegions]);

  // Helper function to get current price range label
  const getPriceRangeLabel = (): string => {
    if (priceRange[0] === 0 && priceRange[1] === maxPrice) return "all";
    if (priceRange[0] === 0 && priceRange[1] === 500000) return "under-500k";
    if (priceRange[0] === 500000 && priceRange[1] === 2000000) return "500k-2m";
    if (priceRange[0] === 2000000 && priceRange[1] === 5000000) return "2m-5m";
    if (priceRange[0] === 5000000 && priceRange[1] === 10000000) return "5m-10m";
    if (priceRange[0] === 10000000 && priceRange[1] === 20000000) return "10m-20m";
    if (priceRange[0] === 20000000 && priceRange[1] === maxPrice) return "over-20m";
    return "all";
  };

  // Helper function to set price range from label
  const setPriceRangeFromLabel = (label: string) => {
    switch (label) {
      case "all":
        setPriceRange([0, maxPrice]);
        break;
      case "under-500k":
        setPriceRange([0, 500000]);
        break;
      case "500k-2m":
        setPriceRange([500000, 2000000]);
        break;
      case "2m-5m":
        setPriceRange([2000000, 5000000]);
        break;
      case "5m-10m":
        setPriceRange([5000000, 10000000]);
        break;
      case "10m-20m":
        setPriceRange([10000000, 20000000]);
        break;
      case "over-20m":
        setPriceRange([20000000, maxPrice]);
        break;
      default:
        setPriceRange([0, maxPrice]);
    }
  };

  const handleRatingChange = (rating: number) => {
    setSelectedRatings(prev => 
      prev.includes(rating) 
        ? prev.filter(r => r !== rating)
        : [...prev, rating]
    );
  };

  const handleRegionChange = (region: string) => {
    setSelectedRegions(prev => 
      prev.includes(region) 
        ? prev.filter(r => r !== region)
        : [...prev, region]
    );
  };

  const clearFilters = () => {
    setSearchTerm("");
    setPriceRange([0, maxPrice]);
    setSelectedRatings([]);
    setSelectedRegions([]);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Dụng cụ & Máy móc nông nghiệp</h1>
          <p className="text-muted-foreground">
            Dụng cụ và máy móc chất lượng cao phục vụ nông nghiệp
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  Bộ lọc
                </h3>
                {(priceRange[0] !== 0 || priceRange[1] !== maxPrice || selectedRatings.length > 0 || selectedRegions.length > 0 || searchTerm) && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    Xóa tất cả
                  </Button>
                )}
              </div>

              <div className="space-y-6">
                {/* Search */}
                <div>
                  <label className="text-sm font-semibold mb-2 block">Tìm kiếm</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      type="search"
                      placeholder="Tìm kiếm sản phẩm..."
                      className="pl-10"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>

                {/* Price Range - Dropdown */}
                <div>
                  <label className="text-sm font-semibold mb-2 block">
                    Khoảng giá
                  </label>
                  <Select value={getPriceRangeLabel()} onValueChange={setPriceRangeFromLabel}>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn khoảng giá" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả</SelectItem>
                      <SelectItem value="under-500k">Dưới ₫500k</SelectItem>
                      <SelectItem value="500k-2m">₫500k - ₫2M</SelectItem>
                      <SelectItem value="2m-5m">₫2M - ₫5M</SelectItem>
                      <SelectItem value="5m-10m">₫5M - ₫10M</SelectItem>
                      <SelectItem value="10m-20m">₫10M - ₫20M</SelectItem>
                      <SelectItem value="over-20m">Trên ₫20M</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Rating Filter */}
                <div>
                  <label className="text-sm font-semibold mb-2 block">Đánh giá</label>
                  <div className="space-y-2">
                    {[5, 4, 3, 2, 1].map((rating) => (
                      <label key={rating} className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="rounded"
                          checked={selectedRatings.includes(rating)}
                          onChange={() => handleRatingChange(rating)}
                        />
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${
                                i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                              }`}
                            />
                          ))}
                          <span className="text-sm">& hơn</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Region Filter */}
                <div>
                  <label className="text-sm font-semibold mb-2 block">Khu vực</label>
                  <div className="space-y-2">
                    {["Miền Bắc", "Miền Trung", "Miền Nam", "Khác"].map((location) => (
                      <label key={location} className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="rounded"
                          checked={selectedRegions.includes(location)}
                          onChange={() => handleRegionChange(location)}
                        />
                        <span className="text-sm">{location}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Products Area */}
          <div className="lg:col-span-3">
            {/* Sort and View Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
              {/* Pagination at top */}
              {!isLoading && totalPages > 1 && (
                <div className="flex items-center">
                  <PaginationControls
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={goToPage}
                  />
                </div>
              )}
              
              <div className="flex items-center space-x-4">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Sắp xếp theo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="relevance">Liên quan nhất</SelectItem>
                    <SelectItem value="price-low">Giá: Thấp đến cao</SelectItem>
                    <SelectItem value="price-high">Giá: Cao đến thấp</SelectItem>
                    <SelectItem value="rating">Đánh giá cao nhất</SelectItem>
                    <SelectItem value="newest">Mới nhất</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex items-center border rounded-md">
                  <Button
                    variant={viewMode === "grid" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("grid")}
                  >
                    <Grid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("list")}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Products Grid */}
            {isLoading ? (
              <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-0">
                      <div className="h-48 bg-muted"></div>
                      <div className="p-4 space-y-2">
                        <div className="h-4 bg-muted rounded"></div>
                        <div className="h-4 bg-muted rounded w-3/4"></div>
                        <div className="h-4 bg-muted rounded w-1/2"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-lg">Không tìm thấy sản phẩm nào</p>
                <Button variant="outline" onClick={clearFilters} className="mt-4">
                  Xóa bộ lọc
                </Button>
              </div>
            ) : (
              <div className={`grid gap-6 ${
                viewMode === "grid" 
                  ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-3" 
                  : "grid-cols-1"
              }`}>
                {paginatedProducts.map((product) => (
                  <Card key={product.id} className="group hover:shadow-lg transition-all duration-300">
                    <CardContent className="p-0">
                      <div className={`flex ${viewMode === "list" ? "flex-row" : "flex-col"}`}>
                        {/* Product Image */}
                        <div className={`relative bg-gradient-to-br from-primary/5 to-accent/5 flex items-center justify-center ${
                          viewMode === "list" ? "w-48 h-32" : "h-48 w-full"
                        }`}>
                          {product.images && product.images.length > 0 ? (
                            <img 
                              src={product.images[0]} 
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-6xl">🔧</span>
                          )}
                          
                          {/* Badges */}
                          <div className="absolute top-4 left-4 space-y-2">
                            {product.originalPrice && product.originalPrice > product.price && (
                              <Badge variant="destructive">
                                -{Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}%
                              </Badge>
                            )}
                          </div>

                          {(() => {
                            const isFav = !!(isAuthenticated && user && favoritesService.isFavorite(user.id, String(product.id)));
                            return (
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-pressed={isFav}
                                className={`absolute top-4 right-4 bg-white/80 hover:bg-white ${isFav ? 'text-red-600' : ''}`}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (!isAuthenticated || !user) { navigate('/auth'); return; }
                                  const now = favoritesService.toggle(user.id, String(product.id));
                                  toast({ title: now ? 'Đã thêm vào yêu thích' : 'Đã xóa khỏi yêu thích', description: product.name });
                                  setWishVersion(v => v + 1);
                                }}
                              >
                                {isFav ? (
                                  <Heart className="h-4 w-4 text-red-600 fill-red-600" />
                                ) : (
                                  <Heart className="h-4 w-4" />
                                )}
                              </Button>
                            );
                          })()}
                        </div>

                        {/* Product Info */}
                        <div className="p-4 flex-1">
                          <div className="mb-2">
                            <Badge variant="outline" className="text-xs">
                              {product.category}
                            </Badge>
                          </div>
                          
                          <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">
                            <Link to={`/product/${product.id}`}>
                              {product.name}
                            </Link>
                          </h3>
                          
                          <p className="text-sm text-muted-foreground mb-2">
                            {product.sellerId && sellerInfo[product.sellerId] ? (
                              <>
                                {sellerInfo[product.sellerId].name} • {sellerInfo[product.sellerId].location || 'Việt Nam'}
                              </>
                            ) : (
                              <>
                                {product.sellerName || 'Nông trại đối tác'} • {product.specifications?.['Xuất xứ'] || 'Việt Nam'}
                              </>
                            )}
                          </p>

                          {/* Rating */}
                          <div className="flex items-center space-x-1 mb-3">
                            <div className="flex items-center">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-4 w-4 ${
                                    i < Math.floor(product.rating || 0)
                                      ? "text-yellow-400 fill-current"
                                      : "text-gray-300"
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-sm font-medium">{product.rating?.toFixed(1) || '0.0'}</span>
                            <span className="text-sm text-muted-foreground">
                              ({product.reviewCount || 0} đánh giá)
                            </span>
                          </div>

                          {/* Price */}
                          <div className="flex items-center space-x-2 mb-4">
                            <span className="text-xl font-bold text-primary">
                              ₫{product.price?.toLocaleString() || '0'}
                            </span>
                            {product.originalPrice && product.originalPrice > product.price && (
                              <span className="text-sm text-muted-foreground line-through">
                                ₫{product.originalPrice.toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>

                    <CardFooter className="p-4 pt-0">
                      <Button type="button" className="w-full" onClick={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!isAuthenticated) {
                          navigate('/auth');
                          return;
                        }
                        try {
                          await cartService.addItem(user!.id, String(product.id), 1);
                          toast({ title: "Thành công", description: `Đã thêm "${product.name}" vào giỏ hàng` });
                        } catch (err) {
                          console.error('Add to cart failed', err);
                          toast({ title: "Thêm vào giỏ thất bại", description: String((err as Error).message || err) });
                        }
                      }}>
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        Thêm vào giỏ
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center mt-12">
                <PaginationControls
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={goToPage}
                />
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default FarmTools;
