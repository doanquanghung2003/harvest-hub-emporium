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

const products = [
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
    inStock: true,
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
    inStock: true,
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
    inStock: true,
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
    inStock: true,
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
    inStock: true,
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
    inStock: true,
  },
  {
    id: 7,
    name: "Organic Spinach",
    price: 3.99,
    rating: 4.5,
    reviews: 92,
    image: "🥬",
    category: "Vegetables",
    farmer: "Green Leaf Farm",
    location: "Vermont",
    isOrganic: true,
    inStock: true,
  },
  {
    id: 8,
    name: "Fresh Corn",
    price: 2.49,
    rating: 4.7,
    reviews: 134,
    image: "🌽",
    category: "Vegetables",
    farmer: "Cornfield Acres",
    location: "Nebraska",
    isOrganic: false,
    inStock: true,
  },
  {
    id: 9,
    name: "Organic Milk",
    price: 4.50,
    rating: 4.8,
    reviews: 201,
    image: "🥛",
    category: "Dairy",
    farmer: "Meadow Farm",
    location: "Wisconsin",
    isOrganic: true,
    inStock: true,
  },
  {
    id: 10,
    name: "Garden Tools Set",
    price: 29.99,
    originalPrice: 39.99,
    rating: 4.6,
    reviews: 45,
    image: "🔧",
    category: "Tools",
    farmer: "Farm Supply Co.",
    location: "Texas",
    discount: 25,
    inStock: true,
  },
  {
    id: 11,
    name: "Heirloom Seeds",
    price: 12.99,
    rating: 4.9,
    reviews: 67,
    image: "🌱",
    category: "Seeds",
    farmer: "Heritage Seeds",
    location: "Colorado",
    isOrganic: true,
    inStock: true,
  },
  {
    id: 12,
    name: "Fresh Honey",
    price: 8.99,
    rating: 4.8,
    reviews: 89,
    image: "🍯",
    category: "Dairy",
    farmer: "Bee Happy Farm",
    location: "Montana",
    isOrganic: true,
    inStock: true,
  }
];

const categories = ["All", "Vegetables", "Fruits", "Grains", "Dairy", "Farm Tools", "Seeds"];

export default function Marketplace() {
  const [products, setProducts] = useState<Product[]>([]);
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [priceRange, setPriceRange] = useState([0, 100000]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Load products from API
  useEffect(() => {
    const loadProducts = async () => {
      try {
        setIsLoading(true);
        const fetchedProducts = await productService.getProducts();
        setProducts(fetchedProducts);
        setFilteredProducts(fetchedProducts);
      } catch (error) {
        console.error('Error loading products:', error);
        // Fallback to mock data
        setProducts(products as any);
        setFilteredProducts(products as any);
      } finally {
        setIsLoading(false);
      }
    };

    loadProducts();
  }, []);

  // Apply filters
  useEffect(() => {
    let filtered = products;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Category filter
    if (selectedCategories.length > 0 && !selectedCategories.includes("All")) {
      filtered = filtered.filter(product =>
        selectedCategories.includes(product.category)
      );
    }

    // Price filter
    filtered = filtered.filter(product =>
      product.price >= priceRange[0] && product.price <= priceRange[1]
    );

    setFilteredProducts(filtered);
  }, [products, searchQuery, selectedCategories, priceRange]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Marketplace</h1>
          <p className="text-muted-foreground">
            Discover fresh products from local farmers and suppliers
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">Filters</h3>
                <Button variant="ghost" size="sm">
                  Clear All
                </Button>
              </div>

              {/* Search */}
              <div className="mb-6">
                <label className="text-sm font-medium mb-2 block">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    type="search"
                    placeholder="Search products..."
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              {/* Categories */}
              <div className="mb-6">
                <label className="text-sm font-medium mb-2 block">Categories</label>
                <div className="space-y-2">
                  {categories.map((category) => (
                    <div key={category} className="flex items-center space-x-2">
                      <Checkbox 
                        id={category}
                        checked={selectedCategories.includes(category)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedCategories([...selectedCategories, category]);
                          } else {
                            setSelectedCategories(selectedCategories.filter(c => c !== category));
                          }
                        }}
                      />
                      <label
                        htmlFor={category}
                        className="text-sm cursor-pointer"
                      >
                        {category}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Price Range */}
              <div className="mb-6">
                <label className="text-sm font-medium mb-2 block">
                  Price Range: ${priceRange[0]} - ${priceRange[1]}
                </label>
                <Slider
                  value={priceRange}
                  onValueChange={setPriceRange}
                  max={100}
                  min={0}
                  step={5}
                  className="mb-4"
                />
              </div>

              {/* Other Filters */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Rating</label>
                  <div className="space-y-2">
                    {[5, 4, 3, 2, 1].map((rating) => (
                      <div key={rating} className="flex items-center space-x-2">
                        <Checkbox id={`rating-${rating}`} />
                        <label
                          htmlFor={`rating-${rating}`}
                          className="text-sm cursor-pointer flex items-center"
                        >
                          <div className="flex items-center mr-1">
                            {[...Array(rating)].map((_, i) => (
                              <Star key={i} className="h-3 w-3 text-yellow-400 fill-current" />
                            ))}
                          </div>
                          & up
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="organic" />
                    <label htmlFor="organic" className="text-sm cursor-pointer">
                      Organic Only
                    </label>
                  </div>
                </div>

                <div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="in-stock" />
                    <label htmlFor="in-stock" className="text-sm cursor-pointer">
                      In Stock Only
                    </label>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Products Area */}
          <div className="lg:col-span-3">
            {/* Sort and View Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
              <div className="flex items-center space-x-4">
                <span className="text-sm text-muted-foreground">
                  {isLoading ? 'Loading...' : `Showing 1-${filteredProducts.length} of ${products.length} products`}
                </span>
              </div>
              
              <div className="flex items-center space-x-4">
                <Select defaultValue="relevance">
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="relevance">Most Relevant</SelectItem>
                    <SelectItem value="price-low">Price: Low to High</SelectItem>
                    <SelectItem value="price-high">Price: High to Low</SelectItem>
                    <SelectItem value="rating">Highest Rated</SelectItem>
                    <SelectItem value="newest">Newest</SelectItem>
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
            ) : (
              <div className={`grid gap-6 ${
                viewMode === "grid" 
                  ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-3" 
                  : "grid-cols-1"
              }`}>
                {filteredProducts.map((product) => (
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

                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-4 right-4 bg-white/80 hover:bg-white"
                        >
                          <Heart className="h-4 w-4" />
                        </Button>
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
                        toast({ title: "Thành công", description: 'Đã thêm "' + product.name + '" vào giỏ hàng' });
                      } catch (e) {
                        console.error('Add to cart failed', e);
                        toast({ title: "Thêm vào giỏ thất bại", description: String((e as Error).message || e) });
                      }
                    }}>
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Add to Cart
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex justify-center mt-12">
              <div className="flex items-center space-x-2">
                <Button variant="outline" disabled>
                  Previous
                </Button>
                <Button variant="default">1</Button>
                <Button variant="outline">2</Button>
                <Button variant="outline">3</Button>
                <Button variant="outline">...</Button>
                <Button variant="outline">12</Button>
                <Button variant="outline">
                  Next
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
