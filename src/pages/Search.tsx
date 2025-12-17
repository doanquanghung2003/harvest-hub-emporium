import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search as SearchIcon, Filter, Star, Heart } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { productService } from "@/services/productService";
import { Product } from "@/types/product";
import { useAuth } from "@/hooks/useAuth";
import { cartService } from "@/services/cartService";
import { useToast } from "@/hooks/use-toast";
import { favoritesService } from "@/services/favoritesService";
import { usePagination } from "@/hooks/usePagination";
import { PaginationControls } from "@/components/ui/PaginationControls";

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || "");
  const [sortBy, setSortBy] = useState("relevant");
  const [priceRange, setPriceRange] = useState("all");
  const [selectedRatings, setSelectedRatings] = useState<number[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [filteredResults, setFilteredResults] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [wishVersion, setWishVersion] = useState(0);

  // Pagination
  const {
    currentPage,
    totalPages,
    paginatedItems: paginatedResults,
    totalItems,
    startIndex,
    endIndex,
    goToPage,
  } = usePagination(filteredResults, { itemsPerPage: 12 });

  // Load all products when component mounts
  useEffect(() => {
    const loadProducts = async () => {
      try {
        setIsLoading(true);
        const products = await productService.getProducts();
        setAllProducts(products);
      } catch (error) {
        console.error('Error loading products:', error);
        setAllProducts([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadProducts();
  }, []);

  // Filter and sort products based on search query and filters
  useEffect(() => {
    let filtered = allProducts;

    // Search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.sellerName?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Price range filter
    if (priceRange !== "all") {
      switch (priceRange) {
        case "0-20":
          filtered = filtered.filter(product => product.price < 20000);
          break;
        case "20-50":
          filtered = filtered.filter(product => product.price >= 20000 && product.price < 50000);
          break;
        case "50-100":
          filtered = filtered.filter(product => product.price >= 50000 && product.price < 100000);
          break;
        case "100+":
          filtered = filtered.filter(product => product.price >= 100000);
          break;
      }
    }

    // Rating filter
    if (selectedRatings.length > 0) {
      const minRating = Math.min(...selectedRatings);
      filtered = filtered.filter(product => (product.rating || 0) >= minRating);
    }

    // Region filter
    if (selectedRegions.length > 0) {
      filtered = filtered.filter(product => {
        const origin = product.specifications?.['Xuất xứ'] || 'Việt Nam';
        return selectedRegions.some(region => 
          origin.toLowerCase().includes(region.toLowerCase())
        );
      });
    }

    // Sort results
    switch (sortBy) {
      case "price-low":
        filtered = [...filtered].sort((a, b) => a.price - b.price);
        break;
      case "price-high":
        filtered = [...filtered].sort((a, b) => b.price - a.price);
        break;
      case "rating":
        filtered = [...filtered].sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case "newest":
        filtered = [...filtered].sort((a, b) => 
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        );
        break;
      default: // relevant - sort by search relevance
        if (searchQuery.trim()) {
          filtered = [...filtered].sort((a, b) => {
            const aNameMatch = a.name.toLowerCase().includes(searchQuery.toLowerCase()) ? 3 : 0;
            const aDescMatch = a.description?.toLowerCase().includes(searchQuery.toLowerCase()) ? 2 : 0;
            const aCatMatch = a.category?.toLowerCase().includes(searchQuery.toLowerCase()) ? 1 : 0;
            const aScore = aNameMatch + aDescMatch + aCatMatch;

            const bNameMatch = b.name.toLowerCase().includes(searchQuery.toLowerCase()) ? 3 : 0;
            const bDescMatch = b.description?.toLowerCase().includes(searchQuery.toLowerCase()) ? 2 : 0;
            const bCatMatch = b.category?.toLowerCase().includes(searchQuery.toLowerCase()) ? 1 : 0;
            const bScore = bNameMatch + bDescMatch + bCatMatch;

            return bScore - aScore;
          });
        }
    }

    setFilteredResults(filtered);
  }, [allProducts, searchQuery, sortBy, priceRange, selectedRatings, selectedRegions]);

  useEffect(() => {
    const onUpdate = () => setWishVersion(v => v + 1);
    window.addEventListener('wishlist:updated', onUpdate as any);
    return () => window.removeEventListener('wishlist:updated', onUpdate as any);
  }, []);

  const handleSearch = () => {
    setSearchParams({ q: searchQuery });
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
    setPriceRange("all");
    setSelectedRatings([]);
    setSelectedRegions([]);
    setSortBy("relevant");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 py-8">
        <div className="container mx-auto px-4">
          {/* Search Header */}
          <div className="mb-8">
            <div className="flex gap-4 mb-4">
              <div className="flex-1 relative">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Tìm kiếm sản phẩm..."
                  className="pl-10"
                />
              </div>
              <Button onClick={handleSearch}>
                <SearchIcon className="w-4 h-4 mr-2" />
                Tìm kiếm
              </Button>
            </div>
            <p className="text-muted-foreground">
              {isLoading ? 'Đang tải...' : (
                <>
                  Tìm thấy <span className="font-semibold">{totalItems}</span> kết quả cho "{searchQuery}"
                  {totalItems > 0 && (
                    <span className="ml-2">(Hiển thị {startIndex}-{endIndex})</span>
                  )}
                </>
              )}
            </p>
          </div>

          <div className="flex gap-8">
            {/* Filters Sidebar */}
            <div className="w-64 space-y-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Filter className="w-4 h-4" />
                      Bộ lọc
                    </h3>
                    {(priceRange !== "all" || selectedRatings.length > 0 || selectedRegions.length > 0) && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={clearFilters}
                      >
                        Xóa bộ lọc
                      </Button>
                    )}
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-semibold mb-2 block">Sắp xếp theo</label>
                      <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn cách sắp xếp" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="relevant">Liên quan nhất</SelectItem>
                          <SelectItem value="price-low">Giá thấp đến cao</SelectItem>
                          <SelectItem value="price-high">Giá cao đến thấp</SelectItem>
                          <SelectItem value="rating">Đánh giá cao nhất</SelectItem>
                          <SelectItem value="newest">Mới nhất</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-semibold mb-2 block">Khoảng giá</label>
                      <Select value={priceRange} onValueChange={setPriceRange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn khoảng giá" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tất cả</SelectItem>
                          <SelectItem value="0-20">Dưới 20.000đ</SelectItem>
                          <SelectItem value="20-50">20.000đ - 50.000đ</SelectItem>
                          <SelectItem value="50-100">50.000đ - 100.000đ</SelectItem>
                          <SelectItem value="100+">Trên 100.000đ</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

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
                </CardContent>
              </Card>
            </div>

            {/* Search Results */}
            <div className="flex-1">
              {isLoading ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
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
              ) : filteredResults.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground text-lg">Không tìm thấy sản phẩm nào</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {searchQuery.trim() 
                      ? `Thử tìm kiếm với từ khóa khác hoặc thay đổi bộ lọc`
                      : 'Nhập từ khóa tìm kiếm để bắt đầu'
                    }
                  </p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {paginatedResults.map((product) => (
                    <Card key={product.id} className="group hover:shadow-lg transition-shadow">
                      <CardContent className="p-0">
                        <div className="relative">
                          {product.images && product.images.length > 0 ? (
                            <img
                              src={product.images[0]}
                              alt={product.name}
                              className="w-full h-48 object-cover rounded-t-lg"
                            />
                          ) : (
                            <div className="h-48 bg-muted flex items-center justify-center">
                              <span className="text-4xl">🛒</span>
                            </div>
                          )}
                          {product.originalPrice && product.originalPrice > product.price && (
                            <Badge className="absolute top-2 left-2" variant="destructive">
                              -{Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}%
                            </Badge>
                          )}
                          {(() => {
                            const isFav = !!(isAuthenticated && user && favoritesService.isFavorite(user.id, String(product.id)));
                            return (
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-pressed={isFav}
                                className={`absolute top-2 right-2 bg-white/80 hover:bg-white ${isFav ? 'text-red-600' : ''}`}
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
                                  <Heart className="w-4 h-4 text-red-600 fill-red-600" />
                                ) : (
                                  <Heart className="w-4 h-4" />
                                )}
                              </Button>
                            );
                          })()}
                        </div>
                        <div className="p-4">
                          <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors">
                            <Link to={`/product/${product.id}`}>
                              {product.name}
                            </Link>
                          </h3>
                          <div className="flex items-center gap-1 mb-2">
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm font-semibold">{product.rating?.toFixed(1) || '0.0'}</span>
                            <span className="text-sm text-muted-foreground">({product.reviewCount || 0})</span>
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg font-bold text-primary">₫{product.price?.toLocaleString() || '0'}</span>
                            {product.originalPrice && product.originalPrice > product.price && (
                              <span className="text-sm line-through text-muted-foreground">
                                ₫{product.originalPrice.toLocaleString()}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-1">{product.sellerName || 'Nông dân'}</p>
                          <p className="text-xs text-muted-foreground">{product.specifications?.['Xuất xứ'] || 'Việt Nam'}</p>
                          <Button className="w-full mt-3" variant="outline" onClick={async () => {
                            if (!isAuthenticated) {
                              navigate('/auth');
                              return;
                            }
                            try {
                              await cartService.addItem(user!.id, String(product.id), 1);
                              toast({ title: "Thành công", description: `Đã thêm \"${product.name}\" vào giỏ hàng` });
                            } catch (e) {
                              console.error('Add to cart failed', e);
                              toast({ title: "Thêm vào giỏ thất bại", description: String((e as Error).message || e) });
                            }
                          }}>
                            Thêm vào giỏ hàng
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Pagination */}
              {filteredResults.length > 0 && (
                <div className="flex justify-center mt-8">
                  <PaginationControls
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={goToPage}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Search;