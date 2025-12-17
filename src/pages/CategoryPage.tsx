import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Heart, ShoppingCart, Star, Grid3X3, List, Filter, Search } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { productService } from "@/services/productService";
import { Product } from "@/types/product";
import { useAuth } from "@/hooks/useAuth";
import { cartService } from "@/services/cartService";
import { useToast } from "@/hooks/use-toast";
import { isProductInCategory } from "@/utils/categoryMatcher";
import { categoryService, Category } from "@/services/categoryService";

// Map category slugs to category names (support both Vietnamese and English slugs)
const categoryMap: Record<string, string> = {
  // English slugs
  "vegetables": "Rau củ",
  "fruits": "Trái cây",
  "grains": "Ngũ cốc",
  "seeds": "Hạt giống",
  "farm-tools": "Dụng cụ nông nghiệp",
  "tools": "Dụng cụ nông nghiệp",
  // Vietnamese slugs (redirect to same category)
  "rau-cu": "Rau củ",
  "trai-cay": "Trái cây",
  "ngu-coc": "Ngũ cốc",
  "hat-giong": "Hạt giống",
  "dung-cu-nong-nghiep": "Dụng cụ nông nghiệp",
  "dung-cu-nong-san": "Dụng cụ nông sản",
};

const CategoryPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [priceRange, setPriceRange] = useState([0, 50000000]);
  const [searchTerm, setSearchTerm] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSort, setSelectedSort] = useState("newest");
  const [category, setCategory] = useState<Category | null>(null);
  const [categoryName, setCategoryName] = useState<string>("Danh mục");

  useEffect(() => {
    loadCategory();
  }, [slug]);

  useEffect(() => {
    if (category) {
      loadProducts();
    }
  }, [category]);

  useEffect(() => {
    filterProducts();
  }, [products, searchTerm, priceRange, selectedSort]);

  const loadCategory = async () => {
    if (!slug) {
      setCategoryName("Danh mục");
      return;
    }

    try {
      // Thử lấy category từ database bằng slug hoặc id
      let foundCategory: Category | null = null;
      
      // Thử tìm bằng slug trước
      const allCategories = await categoryService.getAllCategories();
      foundCategory = allCategories.find(
        (cat) => cat.slug === slug || cat.id === slug
      ) || null;

      if (foundCategory) {
        setCategory(foundCategory);
        setCategoryName(foundCategory.name);
      } else {
        // Fallback về categoryMap cũ
        const mappedName = categoryMap[slug];
        if (mappedName) {
          setCategoryName(mappedName);
        } else {
          setCategoryName(slug);
        }
      }
    } catch (error) {
      console.error("Error loading category:", error);
      // Fallback về categoryMap
      const mappedName = categoryMap[slug];
      setCategoryName(mappedName || slug);
    }
  };

  const loadProducts = async () => {
    try {
      setIsLoading(true);
      const allProducts = await productService.getProducts();
      
      // Filter by category
      let categoryProducts = allProducts;
      if (category && category.name) {
        // Nếu có category từ database, filter theo tên category
        categoryProducts = allProducts.filter((p) => {
          return isProductInCategory(p.category, category.name);
        });
      } else if (categoryName && categoryName !== "Danh mục") {
        // Fallback: dùng categoryName từ categoryMap
        categoryProducts = allProducts.filter((p) => {
          return isProductInCategory(p.category, categoryName);
        });
      }
      
      console.log('CategoryPage - All products:', allProducts.length);
      console.log('CategoryPage - Filtered products:', categoryProducts.length);
      console.log('CategoryPage - Slug:', slug, 'Category name:', categoryName);
      console.log('CategoryPage - Category from DB:', category);
      
      setProducts(categoryProducts);
    } catch (error) {
      console.error("Error loading products:", error);
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filterProducts = () => {
    let filtered = [...products];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (p.description || "").toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Price filter
    filtered = filtered.filter(
      (p) => p.price >= priceRange[0] && p.price <= priceRange[1]
    );

    // Sort
    switch (selectedSort) {
      case "price-low":
        filtered.sort((a, b) => a.price - b.price);
        break;
      case "price-high":
        filtered.sort((a, b) => b.price - a.price);
        break;
      case "rating":
        filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case "newest":
      default:
        filtered.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        break;
    }

    setFilteredProducts(filtered);
  };

  const handleAddToCart = async (product: Product) => {
    if (!isAuthenticated) {
      navigate("/auth");
      return;
    }

    try {
      await cartService.addToCart(user!.id, product.id, 1);
      toast({
        title: "Thành công",
        description: "Đã thêm vào giỏ hàng",
      });
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Không thể thêm vào giỏ hàng",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 py-8">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">{categoryName}</h1>
            <p className="text-muted-foreground">
              {filteredProducts.length} sản phẩm
            </p>
          </div>

          {/* Filters and Search */}
          <div className="mb-6 space-y-4">
            <div className="flex gap-4 items-center">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Tìm kiếm sản phẩm..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={selectedSort} onValueChange={setSelectedSort}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sắp xếp" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Mới nhất</SelectItem>
                  <SelectItem value="price-low">Giá thấp → cao</SelectItem>
                  <SelectItem value="price-high">Giá cao → thấp</SelectItem>
                  <SelectItem value="rating">Đánh giá cao</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Button
                  variant={viewMode === "grid" ? "default" : "outline"}
                  size="icon"
                  onClick={() => setViewMode("grid")}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "outline"}
                  size="icon"
                  onClick={() => setViewMode("list")}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Price Range */}
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">Khoảng giá:</span>
              <Input
                type="number"
                placeholder="Từ"
                value={priceRange[0]}
                onChange={(e) =>
                  setPriceRange([parseInt(e.target.value) || 0, priceRange[1]])
                }
                className="w-32"
              />
              <span className="text-muted-foreground">-</span>
              <Input
                type="number"
                placeholder="Đến"
                value={priceRange[1]}
                onChange={(e) =>
                  setPriceRange([priceRange[0], parseInt(e.target.value) || 50000000])
                }
                className="w-32"
              />
            </div>
          </div>

          {/* Products Grid/List */}
          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Đang tải sản phẩm...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Không tìm thấy sản phẩm nào</p>
            </div>
          ) : (
            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
                  : "space-y-4"
              }
            >
              {filteredProducts.map((product) => (
                <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <Link to={`/product/${product.id}`}>
                    <div className="aspect-square relative overflow-hidden bg-muted">
                      <img
                        src={product.images?.[0] || "/placeholder.svg"}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/placeholder.svg";
                        }}
                      />
                      {product.originalPrice && (
                        <Badge
                          variant="destructive"
                          className="absolute top-2 right-2"
                        >
                          -{Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}%
                        </Badge>
                      )}
                    </div>
                  </Link>
                  <CardContent className="p-4">
                    <Link to={`/product/${product.id}`}>
                      <h3 className="font-semibold mb-2 line-clamp-2 hover:text-primary">
                        {product.name}
                      </h3>
                    </Link>
                    <div className="flex items-center gap-2 mb-2">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm">
                        {product.rating?.toFixed(1) || "0.0"}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        ({product.reviewCount || 0})
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-lg font-bold text-primary">
                        ₫{product.price.toLocaleString()}
                      </span>
                      {product.originalPrice && (
                        <span className="text-sm text-muted-foreground line-through">
                          ₫{product.originalPrice.toLocaleString()}
                        </span>
                      )}
                    </div>
                    <Button
                      className="w-full"
                      onClick={() => handleAddToCart(product)}
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Thêm vào giỏ
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CategoryPage;

