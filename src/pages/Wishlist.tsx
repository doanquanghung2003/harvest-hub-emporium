import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, ShoppingCart, Trash2, Star } from "lucide-react";
import { AuthGuard } from "@/components/AuthGuard";
import { useAuth } from "@/hooks/useAuth";
import { favoritesService } from "@/services/favoritesService";
import { productService } from "@/services/productService";

const Wishlist = () => {
  const { user, isAuthenticated } = useAuth();
  const [wishlistItems, setWishlistItems] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!isAuthenticated || !user) { setWishlistItems([]); return; }
      const favs = favoritesService.list(user.id);
      const products = await Promise.all(favs.map(async f => {
        try { return await productService.getProductById(f.productId); } catch { return null; }
      }));
      setWishlistItems(products.filter(Boolean));
    };
    load();
    const onUpdate = () => load();
    window.addEventListener('wishlist:updated', onUpdate as any);
    return () => window.removeEventListener('wishlist:updated', onUpdate as any);
  }, [isAuthenticated, user]);

  const removeFromWishlist = (id: string) => {
    if (!user) return;
    favoritesService.toggle(user.id, id);
  };

  if (wishlistItems.length === 0) {
    return (
      <AuthGuard>
        <div className="min-h-screen flex flex-col">
          <Header />
          <main className="flex-1 py-8">
            <div className="container mx-auto px-4">
              <div className="text-center py-16">
                <Heart className="w-24 h-24 mx-auto mb-6 text-muted-foreground" />
                <h2 className="text-2xl font-bold mb-4">Danh sách yêu thích trống</h2>
                <p className="text-muted-foreground mb-8">Hãy thêm sản phẩm yêu thích để dễ dàng tìm lại sau này</p>
                <Button asChild>
                  <a href="/marketplace">Khám phá sản phẩm</a>
                </Button>
              </div>
            </div>
          </main>
          <Footer />
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 py-8">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-3xl font-bold">Danh sách yêu thích</h1>
              <div className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-primary" />
                <span className="text-muted-foreground">{wishlistItems.length} sản phẩm</span>
              </div>
            </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {wishlistItems.map((product) => (
              <Card key={product.id} className="group hover:shadow-lg transition-shadow">
                <CardContent className="p-0">
                  <div className="relative">
                    <img
                      src={product.images && product.images[0]}
                      alt={product.name}
                      className="w-full h-48 object-cover rounded-t-lg"
                    />
                    {product.originalPrice && (
                      <Badge className="absolute top-2 left-2" variant="destructive">
                        -{Math.round((1 - product.price / product.originalPrice) * 100)}%
                      </Badge>
                    )}
                    {!product.inStock && (
                      <Badge className="absolute top-2 left-2" variant="secondary">
                        Hết hàng
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 bg-white/80 hover:bg-white text-red-500"
                      onClick={() => removeFromWishlist(product.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors">
                      {product.name}
                    </h3>
                    <div className="flex items-center gap-1 mb-2">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm font-semibold">{product.rating}</span>
                      <span className="text-sm text-muted-foreground">({product.reviews})</span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg font-bold text-primary">{product.price?.toLocaleString()}đ</span>
                      {product.originalPrice && (
                        <span className="text-sm line-through text-muted-foreground">
                          {product.originalPrice.toLocaleString()}đ
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{product.sellerName}</p>
                    
                    <div className="space-y-2">
                      <Button 
                        className="w-full" 
                        disabled={!product.inStock}
                        variant={product.inStock ? "default" : "secondary"}
                      >
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        {product.inStock ? "Thêm vào giỏ hàng" : "Hết hàng"}
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => removeFromWishlist(product.id as string)}
                      >
                        <Heart className="w-4 h-4 mr-2" />
                        Xóa khỏi yêu thích
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
    </AuthGuard>
  );
};

export default Wishlist;