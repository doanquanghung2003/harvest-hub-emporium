import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Search, Filter, Grid, List, Star, Heart, ShoppingCart } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { productService } from "@/services/productService";
import { Product, ProductFilters } from "@/types/product";
import { useAuth } from "@/hooks/useAuth";
import { cartService } from "@/services/cartService";
import { useToast } from "@/hooks/use-toast";
import { favoritesService } from "@/services/favoritesService";
import { usePagination } from "@/hooks/usePagination";
import { PaginationControls } from "@/components/ui/PaginationControls";

interface Category {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  image?: string;
  color?: string;
  slug?: string;
  isActive: boolean;
  isFeatured: boolean;
  sortOrder: number;
}

// Mapping between Vietnamese category names and possible product category values
const categoryMapping: Record<string, string[]> = {
  "Rau củ": ["Rau củ", "vegetables", "vegetable", "rau cu"],
  "Trái cây": ["Trái cây", "fruits", "fruit", "trai cay"],
  "Hạt giống": ["Hạt giống", "seeds", "seed", "hat giong"],
  "Dụng cụ nông nghiệp": [
    "Dụng cụ nông nghiệp", 
    "Dụng Cụ Nông Nghiệp",
    "DỤNG CỤ NÔNG NGHIỆP",
    "farm tools", 
    "farm tool", 
    "dung cu nong nghiep", 
    "tools",
    "agricultural tools",
    "agricultural tool",
    "nông cụ",
    "Nông Cụ",
    "dụng cụ",
    "Dụng Cụ",
    "dung cu",
    "nong cu",
    "farm equipment",
    "equipment"
  ],
  // Alias for "Dụng Cụ Nông Nghiệp" with capital C
  "Dụng Cụ Nông Nghiệp": [
    "Dụng cụ nông nghiệp", 
    "Dụng Cụ Nông Nghiệp",
    "DỤNG CỤ NÔNG NGHIỆP",
    "farm tools", 
    "farm tool", 
    "dung cu nong nghiep", 
    "tools",
    "agricultural tools",
    "agricultural tool",
    "nông cụ",
    "Nông Cụ",
    "dụng cụ",
    "Dụng Cụ",
    "dung cu",
    "nong cu",
    "farm equipment",
    "equipment"
  ],
  "Ngũ cốc": ["Ngũ cốc", "grains", "grain", "ngu coc"],
  "Sữa": ["Sữa", "dairy", "sua"],
};

// Helper function to normalize Vietnamese text for comparison (remove diacritics and normalize spaces)
const normalizeVietnamese = (text: string): string => {
  return text
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
    .replace(/\s+/g, " "); // Normalize spaces
};

// Helper function to check if product category matches selected category name
const matchesCategory = (productCategory: string, categoryName: string, categorySlug?: string): boolean => {
  if (!productCategory || !categoryName) return false;
  
  const normalizedProduct = normalizeVietnamese(productCategory);
  const normalizedCategory = normalizeVietnamese(categoryName);
  
  // Direct match (case-insensitive, diacritic-insensitive)
  if (normalizedProduct === normalizedCategory) {
    return true;
  }
  
  // Check if product category matches slug
  if (categorySlug) {
    const normalizedSlug = normalizeVietnamese(categorySlug);
    if (normalizedProduct === normalizedSlug) {
      return true;
    }
  }
  
  // Check mapping - this is the key part for English to Vietnamese matching
  // First try exact key match
  let possibleValues = categoryMapping[categoryName];
  
  // If not found, try case-insensitive key match
  if (!possibleValues) {
    const matchingKey = Object.keys(categoryMapping).find(key => 
      normalizeVietnamese(key) === normalizedCategory
    );
    if (matchingKey) {
      possibleValues = categoryMapping[matchingKey];
      console.log(`🔍 Found category mapping via case-insensitive match: "${matchingKey}" for "${categoryName}"`);
    }
  }
  
  if (possibleValues) {
    const found = possibleValues.some(value => {
      const normalizedValue = normalizeVietnamese(value);
      return normalizedProduct === normalizedValue;
    });
    if (found) {
      console.log(`✅ Mapping match: "${productCategory}" → "${categoryName}"`);
    } else if (normalizeVietnamese(categoryName) === normalizeVietnamese("Dụng cụ nông nghiệp")) {
      // Special debug for "Dụng cụ nông nghiệp"
      console.log(`❌ "Dụng cụ nông nghiệp" mismatch: product="${productCategory}" (normalized: "${normalizedProduct}") not in mapping values:`, possibleValues.map(v => normalizeVietnamese(v)));
    }
    return found;
  }
  
  // Also check reverse mapping - if categoryName is in the mapping values, check if productCategory matches the key
  for (const [key, values] of Object.entries(categoryMapping)) {
    if (normalizeVietnamese(key) === normalizedCategory) {
      const found = values.some(value => {
        const normalizedValue = normalizeVietnamese(value);
        return normalizedProduct === normalizedValue;
      });
      if (found) {
        console.log(`✅ Reverse mapping match: "${productCategory}" → "${categoryName}" via key "${key}"`);
        return true;
      }
    }
  }
  
  return false;
};

export default function MarketplaceNew() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [priceRange, setPriceRange] = useState([0, 10000000]);
  const [maxPrice, setMaxPrice] = useState(10000000); // Dynamic max price based on products
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [wishVersion, setWishVersion] = useState(0);

  // Pagination
  const {
    currentPage,
    totalPages,
    paginatedItems: paginatedProducts,
    totalItems,
    startIndex,
    endIndex,
    goToPage,
    nextPage,
    previousPage,
  } = usePagination(filteredProducts, { itemsPerPage: 9 });

  // Reset to page 1 when filters change
  useEffect(() => {
    if (currentPage > 1) {
      goToPage(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, selectedCategories.join(','), priceRange.join(',')]);

  // Load categories from API
  useEffect(() => {
    const loadCategories = async () => {
      try {
        setIsLoadingCategories(true);
        const response = await fetch('http://localhost:8081/api/categories/active');
        if (response.ok) {
          const fetchedCategories = await response.json();
          // Sort by sortOrder, then by name
          const sortedCategories = fetchedCategories.sort((a: Category, b: Category) => {
            if (a.sortOrder !== b.sortOrder) {
              return a.sortOrder - b.sortOrder;
            }
            return (a.name || '').localeCompare(b.name || '');
          });
          setCategories(sortedCategories);
        } else {
          console.error('Error loading categories:', response.statusText);
          setCategories([]);
        }
      } catch (error) {
        console.error('Error loading categories:', error);
        setCategories([]);
      } finally {
        setIsLoadingCategories(false);
      }
    };

    loadCategories();
  }, []);

  // Load products from API
  useEffect(() => {
    const loadProducts = async () => {
      try {
        setIsLoading(true);
        const fetchedProducts = await productService.getProducts();
        setProducts(fetchedProducts);
        setFilteredProducts(fetchedProducts);
        
        // Calculate max price from products
        const prices = fetchedProducts
          .map(p => p.price)
          .filter((price): price is number => price !== null && price !== undefined);
        
        if (prices.length > 0) {
          const maxProductPrice = Math.max(...prices);
          // Round up to nearest 1000000 for better UX, with minimum of 10M
          const roundedMax = Math.max(10000000, Math.ceil(maxProductPrice / 1000000) * 1000000);
          
          // Update max price for slider
          setMaxPrice(roundedMax);
          console.log(`💰 Calculated max price: ₫${roundedMax.toLocaleString()} (max product price: ₫${maxProductPrice.toLocaleString()})`);
        }
      } catch (error) {
        console.error('Error loading products:', error);
        setProducts([]);
        setFilteredProducts([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadProducts();
  }, []);

  // Auto-adjust price range when maxPrice changes (only if current range is too low)
  useEffect(() => {
    setPriceRange(prevRange => {
      if (maxPrice > prevRange[1]) {
        console.log(`💰 Auto-adjusted price range to ₫0 - ₫${maxPrice.toLocaleString()}`);
        return [0, maxPrice];
      }
      return prevRange;
    });
  }, [maxPrice]);

  // Debug: Log categories from API when they're loaded and compare with product categories
  useEffect(() => {
    if (categories.length > 0 && products.length > 0) {
      const categoryNames = categories.map(c => c.name);
      const productCategories = [...new Set(products.map(p => p.category).filter(Boolean))];
      
      console.log('=== CATEGORY COMPARISON ===');
      console.log('Categories from API:', categoryNames);
      console.log('Categories from Products:', productCategories);
      
      // Find mismatches
      const mismatches = productCategories.filter(pc => 
        !categoryNames.some(cn => 
          pc.trim().toLowerCase() === cn.trim().toLowerCase()
        )
      );
      
      if (mismatches.length > 0) {
        console.warn('⚠️ Category name mismatches found:', mismatches);
        console.warn('These product categories do not match any API category names');
      } else {
        console.log('✅ All product categories match API categories');
      }
    }
  }, [categories, products]);

  useEffect(() => {
    const onUpdate = () => setWishVersion(v => v + 1);
    window.addEventListener('wishlist:updated', onUpdate as any);
    return () => window.removeEventListener('wishlist:updated', onUpdate as any);
  }, []);

  // Debug: Log filteredProducts state changes
  useEffect(() => {
    console.log(`🔄 State updated: filteredProducts = ${filteredProducts.length} products`);
  }, [filteredProducts]);

  // Apply filters
  useEffect(() => {
    let filtered = products;

    // Removed: Filter that excludes products with categories not in database
    // Now showing all products regardless of category matching

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Category filter - use mapping to match Vietnamese category names with product category values
    if (selectedCategories.length > 0 && !selectedCategories.includes("All") && !selectedCategories.includes("Tất cả")) {
      const beforeFilter = filtered.length;
      
      // Debug: Log all products and their categories before filtering
      console.log(`🔍 Before category filter: ${filtered.length} products`);
      console.log(`🔍 Selected categories:`, selectedCategories);
      console.log(`🔍 Available categories from API:`, categories.map(c => c.name));
      console.log(`🔍 All product categories:`, [...new Set(filtered.map(p => p.category).filter(Boolean))]);
      
      filtered = filtered.filter(product => {
        if (!product.category) {
          console.log(`❌ Product "${product.name}" has no category - excluding`);
          return false;
        }
        
        const matches = selectedCategories.some(selectedCat => {
          // Find category object to get slug - try both exact match and case-insensitive match
          let categoryObj = categories.find(c => c.name === selectedCat);
          if (!categoryObj) {
            // Try case-insensitive match
            categoryObj = categories.find(c => 
              normalizeVietnamese(c.name) === normalizeVietnamese(selectedCat)
            );
          }
          
          const match = matchesCategory(product.category, selectedCat, categoryObj?.slug);
          
          // Also try matching with category name from API if different
          if (!match && categoryObj) {
            const matchWithApiName = matchesCategory(product.category, categoryObj.name, categoryObj?.slug);
            if (matchWithApiName) {
              console.log(`✅ Product "${product.name}" (category: "${product.category}") MATCHES via API category name "${categoryObj.name}"`);
              return true;
            }
          }
          
          if (match) {
            console.log(`✅ Product "${product.name}" (category: "${product.category}") MATCHES "${selectedCat}"`);
          } else {
            console.log(`❌ Product "${product.name}" (category: "${product.category}") does NOT match "${selectedCat}"`);
          }
          
          return match;
        });
        
        return matches;
      });
      
      // Debug: Log filter results
      console.log(`📊 Category Filter: ${beforeFilter} → ${filtered.length} products (selected: ${selectedCategories.join(', ')})`);
      console.log(`📊 Matched products:`, filtered.map(p => ({ name: p.name, category: p.category })));
    }

    // Price filter
    const beforePriceFilter = filtered.length;
    
    // Debug: Log all products and their prices before price filter
    if (beforePriceFilter > 0) {
      console.log(`💰 Before price filter - Products and prices:`, filtered.map(p => ({ 
        name: p.name, 
        price: p.price, 
        priceType: typeof p.price 
      })));
      console.log(`💰 Price range: ₫${priceRange[0]} - ₫${priceRange[1]}`);
    }
    
    const filteredOutByPrice: Array<{name: string, price: number | undefined | null, reason: string}> = [];
    
    filtered = filtered.filter(product => {
      const price = product.price;
      
      // If price is null/undefined, include the product (don't filter it out)
      if (price === null || price === undefined) {
        console.log(`💰 Product "${product.name}" has no price - including it`);
        return true;
      }
      
      const inRange = price >= priceRange[0] && price <= priceRange[1];
      
      if (!inRange) {
        let reason = '';
        if (price < priceRange[0]) {
          reason = `Price ${price} < min ${priceRange[0]}`;
        } else if (price > priceRange[1]) {
          reason = `Price ${price} > max ${priceRange[1]}`;
        }
        filteredOutByPrice.push({ name: product.name, price: product.price, reason });
        console.log(`💰 Product "${product.name}" filtered out: ${reason}`);
      }
      
      return inRange;
    });
    
    if (beforePriceFilter !== filtered.length) {
      console.log(`💰 Price Filter: ${beforePriceFilter} → ${filtered.length} products (range: ₫${priceRange[0]} - ₫${priceRange[1]})`);
      if (filteredOutByPrice.length > 0) {
        console.log(`💰 Products filtered out by price:`, filteredOutByPrice);
      }
    }

    console.log(`🎯 Final: ${filtered.length} products after all filters`);
    
    setFilteredProducts(filtered);
  }, [products, searchQuery, selectedCategories, priceRange]);

  // Helper function to get current price range label
  const getPriceRangeLabel = (): string => {
    if (priceRange[0] === 0 && priceRange[1] === maxPrice) return "all";
    if (priceRange[0] === 0 && priceRange[1] === 100000) return "under-100k";
    if (priceRange[0] === 100000 && priceRange[1] === 500000) return "100k-500k";
    if (priceRange[0] === 500000 && priceRange[1] === 1000000) return "500k-1m";
    if (priceRange[0] === 1000000 && priceRange[1] === 5000000) return "1m-5m";
    if (priceRange[0] === 5000000 && priceRange[1] === 10000000) return "5m-10m";
    if (priceRange[0] === 10000000 && priceRange[1] === maxPrice) return "over-10m";
    return "all";
  };

  // Helper function to set price range from label
  const setPriceRangeFromLabel = (label: string) => {
    switch (label) {
      case "all":
        setPriceRange([0, maxPrice]);
        break;
      case "under-100k":
        setPriceRange([0, 100000]);
        break;
      case "100k-500k":
        setPriceRange([100000, 500000]);
        break;
      case "500k-1m":
        setPriceRange([500000, 1000000]);
        break;
      case "1m-5m":
        setPriceRange([1000000, 5000000]);
        break;
      case "5m-10m":
        setPriceRange([5000000, 10000000]);
        break;
      case "over-10m":
        setPriceRange([10000000, maxPrice]);
        break;
      default:
        setPriceRange([0, maxPrice]);
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCategories([]);
    setPriceRange([0, maxPrice]); // Reset to "Tất cả"
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Chợ nông sản</h1>
          <p className="text-muted-foreground">
            Khám phá sản phẩm tươi ngon từ nông dân và nhà cung cấp địa phương
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">Bộ lọc</h3>
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Xóa tất cả
                </Button>
              </div>

              {/* Search */}
              <div className="mb-6">
                <label className="text-sm font-medium mb-2 block">Tìm kiếm</label>
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

              {/* Categories */}
              <div className="mb-6">
                <label className="text-sm font-medium mb-2 block">Danh mục</label>
                <div className="space-y-2">
                  {isLoadingCategories ? (
                    <div className="text-sm text-muted-foreground">Đang tải danh mục...</div>
                  ) : (
                    <>
                      {/* All option */}
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="All"
                          checked={selectedCategories.includes("All") || selectedCategories.length === 0}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedCategories(["All"]);
                            } else {
                              setSelectedCategories([]);
                            }
                          }}
                        />
                        <label
                          htmlFor="All"
                          className="text-sm cursor-pointer"
                        >
                          Tất cả
                        </label>
                      </div>
                      {/* Categories from API */}
                      {categories.map((category) => (
                        <div key={category.id} className="flex items-center space-x-2">
                          <Checkbox 
                            id={category.id}
                            checked={selectedCategories.includes(category.name)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedCategories([...selectedCategories.filter(c => c !== "All"), category.name]);
                              } else {
                                setSelectedCategories(selectedCategories.filter(c => c !== category.name));
                              }
                            }}
                          />
                          <label
                            htmlFor={category.id}
                            className="text-sm cursor-pointer"
                          >
                            {category.name}
                          </label>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>

              {/* Price Range - Dropdown */}
              <div className="mb-6">
                <label className="text-sm font-medium mb-2 block">
                  Khoảng giá
                </label>
                <Select value={getPriceRangeLabel()} onValueChange={setPriceRangeFromLabel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn khoảng giá" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    <SelectItem value="under-100k">Dưới ₫100k</SelectItem>
                    <SelectItem value="100k-500k">₫100k - ₫500k</SelectItem>
                    <SelectItem value="500k-1m">₫500k - ₫1M</SelectItem>
                    <SelectItem value="1m-5m">₫1M - ₫5M</SelectItem>
                    <SelectItem value="5m-10m">₫5M - ₫10M</SelectItem>
                    {maxPrice > 10000000 && (
                      <SelectItem value="over-10m">Trên ₫10M</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </Card>
          </div>

          {/* Products Area */}
          <div className="lg:col-span-3">
            {/* Sort and View Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
              {/* Pagination at top */}
              {!isLoading && filteredProducts.length > 0 && (
                <div className="flex items-center">
                  <PaginationControls
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={goToPage}
                  />
                </div>
              )}
              
              <div className="flex items-center space-x-4">
                <Select defaultValue="relevance">
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
                            <span className="text-6xl">🛒</span>
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
                            by {product.sellerName || 'Nông dân'} • {product.specifications?.['Xuất xứ'] || 'Việt Nam'}
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
            {filteredProducts.length > 0 && (
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
}
