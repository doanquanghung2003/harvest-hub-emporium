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
import { getRegionFromCity } from "@/utils/regionMapper";
import { isProductInCategory } from "@/utils/categoryMatcher";

const Fruits = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [wishVersion, setWishVersion] = useState(0);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [priceRange, setPriceRange] = useState([0, 500000]);
  const [sortBy, setSortBy] = useState<string>("relevance");
  const [selectedRatings, setSelectedRatings] = useState<number[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [sellerInfo, setSellerInfo] = useState<Record<string, { name: string; location?: string }>>({});
  const maxPrice = 500000;

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
  }, [searchQuery, priceRange.join(','), sortBy, selectedRatings.join(','), selectedRegions.join(',')]);

  useEffect(() => {
    const onUpdate = () => setWishVersion(v => v + 1);
    window.addEventListener('wishlist:updated', onUpdate as any);
    return () => window.removeEventListener('wishlist:updated', onUpdate as any);
  }, []);

  // Mock data fallback
  const fallbackFruits = [
    {
      id: 1,
      name: "Cam sành Cao Lãnh",
      price: 40000,
      originalPrice: 45000,
      images: ["https://images.unsplash.com/photo-1577234286642-fc512a5f8f11?w=300"],
      rating: 4.7,
      reviewCount: 178,
      sellerName: "Vườn trái cây Miền Tây",
      description: "Cam sành ngọt mát, giàu vitamin C",
      specifications: { 'Xuất xứ': 'Đồng Tháp' }
    },
    {
      id: 2,
      name: "Xoài cát Hòa Lộc",
      price: 80000,
      originalPrice: null,
      images: ["https://images.unsplash.com/photo-1553279768-865429fa0078?w=300"],
      rating: 4.9,
      reviewCount: 245,
      sellerName: "Vườn xoài Đồng Tháp",
      description: "Xoài cát Hòa Lộc thơm ngon đặc trưng",
      specifications: { 'Xuất xứ': 'Đồng Tháp' }
    },
    {
      id: 3,
      name: "Thanh long ruột đỏ",
      price: 35000,
      originalPrice: 40000,
      images: ["https://images.unsplash.com/photo-1584546556905-97ce6ac3ac9e?w=300"],
      rating: 4.6,
      reviewCount: 134,
      sellerName: "Nông trại Long An",
      description: "Thanh long ruột đỏ ngọt tự nhiên",
      specifications: { 'Xuất xứ': 'Long An' }
    },
    {
      id: 4,
      name: "Chôm chôm nhãn",
      price: 50000,
      originalPrice: null,
      images: ["https://images.unsplash.com/photo-1618105089923-4d30f4e90c89?w=300"],
      rating: 4.8,
      reviewCount: 89,
      sellerName: "Vườn nhiệt đới Tiền Giang",
      description: "Chôm chôm nhãn tươi ngon, ngọt mát",
      specifications: { 'Xuất xứ': 'Tiền Giang' }
    },
    {
      id: 5,
      name: "Bưởi da xanh",
      price: 60000,
      originalPrice: 70000,
      images: ["https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=300"],
      rating: 4.5,
      reviewCount: 167,
      sellerName: "Vườn bưởi Bến Tre",
      description: "Bưởi da xanh ngọt thanh, múi dày",
      specifications: { 'Xuất xứ': 'Bến Tre' }
    },
    {
      id: 6,
      name: "Dừa xiêm xanh",
      price: 25000,
      originalPrice: null,
      images: ["https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=300"],
      rating: 4.7,
      reviewCount: 92,
      sellerName: "Vườn dừa Bến Tre",
      description: "Dừa xiêm xanh tươi mát, nước ngọt",
      specifications: { 'Xuất xứ': 'Bến Tre' }
    }
  ];

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setIsLoading(true);
        console.log('🔄 Loading fruits products...');
        
        // Try multiple category variations to match products
        const categoryVariations = ['Trái cây', 'Trái Cây', 'trái cây', 'TRÁI CÂY', 'Fruits', 'fruits'];
        let fruitProducts: Product[] = [];
        
        // Try each category variation
        for (const category of categoryVariations) {
          try {
            const products = await productService.getProducts({ category });
            if (products && products.length > 0) {
              fruitProducts = products;
              console.log(`✅ Found ${products.length} products with category: "${category}"`);
              break;
            }
          } catch (err) {
            console.log(`⚠️ No products found for category: "${category}"`);
          }
        }
        
        // If backend filtering didn't work, try client-side filtering as fallback
        if (fruitProducts.length === 0) {
          console.log('⚠️ Backend filtering returned no results, trying client-side filtering...');
          const allProducts = await productService.getProducts();
          console.log('📦 Total products received:', allProducts.length);
          
          fruitProducts = allProducts.filter(product => {
            if (!product.category) {
              return false;
            }
            
            const categoryLower = product.category.toLowerCase().trim();
            const targetLower = 'trái cây'.toLowerCase().trim();
            
            // Match trực tiếp (case-insensitive)
            const directMatch = categoryLower === targetLower || 
                               categoryLower.includes('trái cây') || 
                               categoryLower.includes('trai cay') ||
                               categoryLower.includes('fruit');
            
            // Match bằng categoryMatcher
            const matcherMatch = isProductInCategory(product.category, 'Trái cây');
            
            return directMatch || matcherMatch;
          });
          
          console.log('🍎 Fruits products found (client-side filter):', fruitProducts.length);
        }
        
        console.log('🍎 Final fruits count:', fruitProducts.length);
        console.log('🍎 Sample fruits:', fruitProducts.slice(0, 5).map(p => ({ 
          name: p.name, 
          category: p.category,
          id: p.id
        })));
        
        if (fruitProducts.length > 0) {
          setProducts(fruitProducts);
          setFilteredProducts(fruitProducts);
        } else {
          // Nếu không có sản phẩm trái cây, hiển thị fallback data
          console.warn('⚠️ No fruits found. Using fallback fruits data.');
          setProducts(fallbackFruits as any);
          setFilteredProducts(fallbackFruits as any);
        }
      } catch (error) {
        console.error('❌ Error loading fruits:', error);
        setProducts(fallbackFruits as any);
        setFilteredProducts(fallbackFruits as any);
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
                throw new Error(`Không thể tải thông tin người bán ${sellerId}`);
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

    if (searchQuery) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchQuery.toLowerCase())
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
  }, [products, searchQuery, priceRange, sortBy, selectedRatings, selectedRegions]);

  // Helper function to get current price range label
  const getPriceRangeLabel = (): string => {
    if (priceRange[0] === 0 && priceRange[1] === maxPrice) return "all";
    if (priceRange[0] === 0 && priceRange[1] === 50000) return "under-50k";
    if (priceRange[0] === 50000 && priceRange[1] === 100000) return "50k-100k";
    if (priceRange[0] === 100000 && priceRange[1] === 200000) return "100k-200k";
    if (priceRange[0] === 200000 && priceRange[1] === 300000) return "200k-300k";
    if (priceRange[0] === 300000 && priceRange[1] === maxPrice) return "over-300k";
    return "all";
  };

  // Helper function to set price range from label
  const setPriceRangeFromLabel = (label: string) => {
    switch (label) {
      case "all":
        setPriceRange([0, maxPrice]);
        break;
      case "under-50k":
        setPriceRange([0, 50000]);
        break;
      case "50k-100k":
        setPriceRange([50000, 100000]);
        break;
      case "100k-200k":
        setPriceRange([100000, 200000]);
        break;
      case "200k-300k":
        setPriceRange([200000, 300000]);
        break;
      case "over-300k":
        setPriceRange([300000, maxPrice]);
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
    setSearchQuery("");
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
          <h1 className="text-3xl font-bold mb-2">Trái cây tươi</h1>
          <p className="text-muted-foreground">
            Trái cây tươi ngon, giàu vitamin từ các vườn trái cây uy tín khắp Việt Nam
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
                {(priceRange[0] !== 0 || priceRange[1] !== maxPrice || selectedRatings.length > 0 || selectedRegions.length > 0 || searchQuery) && (
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
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
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
                      <SelectItem value="under-50k">Dưới ₫50k</SelectItem>
                      <SelectItem value="50k-100k">₫50k - ₫100k</SelectItem>
                      <SelectItem value="100k-200k">₫100k - ₫200k</SelectItem>
                      <SelectItem value="200k-300k">₫200k - ₫300k</SelectItem>
                      <SelectItem value="over-300k">Trên ₫300k</SelectItem>
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
                            <span className="text-6xl">🍎</span>
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

export default Fruits;
