import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, Heart } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { productService } from "@/services/productService";
import { Product } from "@/types/product";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { favoritesService } from "@/services/favoritesService";

type SellerInfo = {
  name: string;
  location?: string;
};

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || "";
const API_PREFIX = API_BASE_URL ? `${API_BASE_URL}/api` : "/api";

const pickSpecValue = (
  specs: Record<string, any> | undefined,
  keys: string[]
): string | undefined => {
  if (!specs) return undefined;
  for (const key of keys) {
    const rawValue = specs[key];
    if (typeof rawValue === "string" && rawValue.trim()) {
      return rawValue.trim();
    }
  }
  return undefined;
};

const featuredProducts = [
  {
    id: 1,
    name: "Organic Tomatoes",
    price: 4.99,
    originalPrice: 6.99,
    rating: 4.8,
    reviews: 124,
    image: "🍅",
    category: "Vegetables",
    farmer: "Green Valley Farm",
    location: "California",
    isOrganic: true,
    discount: 29,
  },
  {
    id: 2,
    name: "Fresh Apples",
    price: 3.50,
    rating: 4.9,
    reviews: 89,
    image: "🍎",
    category: "Fruits",
    farmer: "Orchard Hills",
    location: "Washington",
    isOrganic: true,
  },
  {
    id: 3,
    name: "Premium Rice",
    price: 12.99,
    originalPrice: 15.99,
    rating: 4.7,
    reviews: 67,
    image: "🌾",
    category: "Grains",
    farmer: "Harvest Co.",
    location: "Arkansas",
    discount: 19,
  },
  {
    id: 4,
    name: "Farm Fresh Eggs",
    price: 5.99,
    rating: 4.9,
    reviews: 156,
    image: "🥚",
    category: "Dairy",
    farmer: "Sunny Side Farm",
    location: "Iowa",
    isOrganic: true,
  },
  {
    id: 5,
    name: "Sweet Carrots",
    price: 2.99,
    rating: 4.6,
    reviews: 43,
    image: "🥕",
    category: "Vegetables",
    farmer: "Root & Branch",
    location: "Oregon",
    isOrganic: true,
  },
  {
    id: 6,
    name: "Seasonal Berries",
    price: 8.99,
    originalPrice: 11.99,
    rating: 4.8,
    reviews: 78,
    image: "🫐",
    category: "Fruits",
    farmer: "Berry Fields",
    location: "Maine",
    discount: 25,
  },
];

export function FeaturedProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sellerInfo, setSellerInfo] = useState<Record<string, SellerInfo>>({});
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [wishVersion, setWishVersion] = useState(0);
  const sellerInfoRef = useRef<Record<string, SellerInfo>>({});

  useEffect(() => {
    sellerInfoRef.current = sellerInfo;
  }, [sellerInfo]);

  const fetchSellerDetails = useCallback(async (productList: Product[]) => {
    try {
      const idsToFetch = Array.from(
        new Set(
          productList
            .map((product) => product.sellerId?.trim())
            .filter(
              (id): id is string =>
                !!id && !sellerInfoRef.current[id]
            )
        )
      );

      if (!idsToFetch.length) {
        return;
      }

      const sellerResponses = await Promise.all(
        idsToFetch.map(async (sellerId) => {
          try {
            const response = await fetch(`${API_PREFIX}/sellers/${sellerId}`);
            if (!response.ok) {
              throw new Error(`Failed to load seller ${sellerId}`);
            }
            const seller = await response.json();
            const locationParts = [
              seller.ward,
              seller.district,
              seller.city || seller.province,
            ].filter(Boolean);
            const location =
              locationParts.join(", ") ||
              seller.address ||
              seller.city ||
              seller.province ||
              undefined;

            return {
              sellerId,
              info: {
                name:
                  seller.businessName?.trim() ||
                  seller.contactPerson?.trim() ||
                  seller.user?.fullName ||
                  "Nông trại đối tác",
                location,
              } satisfies SellerInfo,
            };
          } catch (error) {
            console.warn("Không thể tải thông tin seller", sellerId, error);
            return null;
          }
        })
      );

      const infoUpdates: Record<string, SellerInfo> = {};
      sellerResponses.forEach((result) => {
        if (result && result.info?.name) {
          infoUpdates[result.sellerId] = result.info;
        }
      });

      if (Object.keys(infoUpdates).length) {
        setSellerInfo((prev) => ({
          ...prev,
          ...infoUpdates,
        }));
      }
    } catch (error) {
      console.error("Lỗi khi tải thông tin seller:", error);
    }
  }, []);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        console.log('🔄 Loading featured products...');
        setIsLoading(true);
        
        console.log('📡 Calling productService.getProducts()...');
        const fetchedProducts = await productService.getProducts();
        console.log('✅ Products fetched successfully:', fetchedProducts);
        
        if (fetchedProducts && fetchedProducts.length > 0) {
          // Lấy 6 sản phẩm đầu tiên làm featured
          const featuredProducts = fetchedProducts.slice(0, 6);
          console.log('🎯 Setting featured products:', featuredProducts);
          await fetchSellerDetails(featuredProducts);
          setProducts(featuredProducts);
        } else {
          console.log('⚠️ No products returned from API, using fallback data');
          setProducts(featuredProducts.slice(0, 6) as any);
        }
      } catch (error) {
        console.error('❌ Error loading featured products:', error);
        console.log('🔄 Falling back to mock data...');
        // Fallback to mock data
        setProducts(featuredProducts.slice(0, 6) as any);
      } finally {
        setIsLoading(false);
        console.log('🏁 Loading completed');
      }
    };

    loadProducts();
  }, []);

  // Re-render to refresh heart color when wishlist changes elsewhere
  useEffect(() => {
    const onUpdate = () => setWishVersion(v => v + 1);
    window.addEventListener('wishlist:updated', onUpdate as any);
    return () => window.removeEventListener('wishlist:updated', onUpdate as any);
  }, []);

  if (isLoading) {
    return (
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Sản phẩm nổi bật
            </h2>
            <p className="text-xl text-muted-foreground">
              Sản phẩm tươi ngon từ nông dân uy tín
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Đang tải dữ liệu...
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
        </div>
      </section>
    );
  }

  // Nếu không có sản phẩm từ API, hiển thị mock data
  if (!products || products.length === 0) {
    console.log('🔄 No products from API, showing mock data');
    return (
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Sản phẩm nổi bật
            </h2>
            <p className="text-xl text-muted-foreground">
              Sản phẩm tươi ngon từ nông dân uy tín
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              (Hiển thị dữ liệu mẫu - API chưa kết nối)
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredProducts.slice(0, 6).map((product) => (
              <Card key={product.id} className="group hover:shadow-lg transition-all duration-300">
                <CardContent className="p-0">
                  {/* Product Image */}
                  <Link to={`/product/${product.id}`} className="block">
                    <div className="relative bg-gradient-to-br from-primary/5 to-accent/5 h-48 flex items-center justify-center cursor-pointer">
                      <span className="text-6xl">{product.image}</span>
                      
                      {/* Wishlist button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`absolute top-4 right-4 bg-white/80 hover:bg-white z-10 ${isAuthenticated && user && favoritesService.isFavorite(user.id, String(product.id)) ? 'text-red-500' : ''}`}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (!isAuthenticated || !user) { navigate('/auth'); return; }
                          const now = favoritesService.toggle(user.id, String(product.id));
                          toast({ title: now ? 'Đã thêm vào yêu thích' : 'Đã xóa khỏi yêu thích', description: product.name });
                        setWishVersion(v => v + 1);
                        }}
                      >
                        <Heart className="h-4 w-4" />
                      </Button>
                    </div>
                  </Link>

                  {/* Product Info */}
                  <div className="p-4">
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
                      by Admin • Việt Nam
                    </p>

                    {/* Rating */}
                    <div className="flex items-center space-x-1 mb-3">
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < Math.floor(product.rating)
                                ? "text-yellow-400 fill-current"
                                : "text-gray-300"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-sm font-medium">{product.rating}</span>
                      <span className="text-sm text-muted-foreground">
                        ({product.reviews} reviews)
                      </span>
                    </div>
                  </div>
                </CardContent>

                {/* Price Section */}
                <CardFooter className="p-4 pt-0">
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center space-x-2">
                      <span className="text-xl font-bold text-primary">
                        ${product.price}
                      </span>
                      {product.originalPrice && (
                        <span className="text-sm text-muted-foreground line-through">
                          ${product.originalPrice}
                        </span>
                      )}
                    </div>
                    {product.discount && (
                      <Badge variant="destructive">
                        -{product.discount}%
                      </Badge>
                    )}
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Sản phẩm nổi bật
          </h2>
          <p className="text-xl text-muted-foreground">
            Sản phẩm tươi ngon từ nông dân uy tín
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => {
            console.log('🎯 Rendering product:', product.name, 'Images:', product.images);
            return (
              <Card key={product.id} className="group hover:shadow-lg transition-all duration-300">
                <CardContent className="p-0">
                  {/* Product Image */}
                  <Link to={`/product/${product.id}`} className="block">
                    <div className="relative bg-gradient-to-br from-primary/5 to-accent/5 h-48 flex items-center justify-center cursor-pointer">
                      {product.images && product.images.length > 0 ? (
                        <img 
                          src={product.images[0]} 
                          alt={product.name}
                          className="w-full h-full object-cover"
                          onLoad={() => console.log('✅ Image loaded successfully:', product.images[0])}
                          onError={(e) => console.log('❌ Image failed to load:', product.images[0], e)}
                        />
                      ) : (
                        <span className="text-6xl">🛒</span>
                      )}
                      
                      {/* Wishlist button */}
                      {(() => {
                        const isFav = !!(isAuthenticated && user && favoritesService.isFavorite(user.id, String(product.id)));
                        return (
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-pressed={isFav}
                            className={`absolute top-4 right-4 bg-white/80 hover:bg-white z-10 ${isFav ? 'text-red-600' : ''}`}
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
                  </Link>

                  {/* Product Info */}
                  <div className="p-4">
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
                    
                    {/* Short Description */}
                    {(product.shortDescription || product.description) && (
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                        {product.shortDescription || 
                         (product.description && product.description.length > 100 
                           ? product.description.substring(0, 100) + '...' 
                           : product.description)}
                      </p>
                    )}
                    
                    {(() => {
                      const sellerKey = product.sellerId?.trim();
                      const sellerProfile = sellerKey ? sellerInfo[sellerKey] : undefined;
                      const farmName =
                        sellerProfile?.name ||
                        (product.sellerName && product.sellerName.trim()) ||
                        pickSpecValue(product.specifications, [
                          "farmName",
                          "FarmName",
                          "Trang trại",
                          "Tên trang trại",
                          "Nông trại",
                        ]) ||
                        (product as any).farmer ||
                        "Nông trại đối tác";
                      const location =
                        sellerProfile?.location ||
                        pickSpecValue(product.specifications, [
                          "Xuất xứ",
                          "Nguồn gốc",
                          "Địa chỉ trang trại",
                        ]) ||
                        (product.origin && product.origin.trim()) ||
                        "Việt Nam";

                      return (
                        <p className="text-sm text-muted-foreground mb-2">
                          by {farmName} • {location}
                        </p>
                      );
                    })()}

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
                  </div>
                </CardContent>

                {/* Price Section */}
                <CardFooter className="p-4 pt-0">
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center space-x-2">
                      <span className="text-xl font-bold text-primary">
                        ₫{product.price?.toLocaleString() || '0'}
                      </span>
                      {product.originalPrice && product.originalPrice > product.price && (
                        <span className="text-sm text-muted-foreground line-through">
                          ₫{product.originalPrice.toLocaleString()}
                        </span>
                      )}
                    </div>
                    {product.originalPrice && product.originalPrice > product.price && (
                      <Badge variant="destructive">
                        -{Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}%
                      </Badge>
                    )}
                  </div>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        <div className="text-center mt-12">
          <Button size="lg" variant="outline" asChild>
            <Link to="/marketplace">
              Xem tất cả sản phẩm
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
