import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Trash2, Plus, Minus, ShoppingCart } from "lucide-react";
import { AuthGuard } from "@/components/AuthGuard";
import { cartService } from "@/services/cartService";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import { productService } from "@/services/productService";
import { flashSaleService } from "@/services/flashSaleService";
import { Badge } from "@/components/ui/badge";

const Cart = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<{ productId: string; price: number; quantity: number }[]>([]);
  const [details, setDetails] = useState<Record<string, { name: string; image?: string; seller?: string }>>({});
  const [cart, setCart] = useState<{ voucherCode?: string; discountAmount?: number; subtotal?: number } | null>(null);
  const [flashSaleProducts, setFlashSaleProducts] = useState<Set<string>>(new Set());

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      try {
        const cartData = await cartService.getUserCart(user.id);
        const cartItems = cartData?.items || [];
        setItems(cartItems);
        setCart(cartData);
        
        // Check which products are in flash sale
        try {
          const activeFlashSales = await flashSaleService.getActiveFlashSales();
          const flashSaleProductIds = new Set<string>();
          for (const flashSale of activeFlashSales) {
            if (flashSale.products) {
              for (const product of flashSale.products) {
                flashSaleProductIds.add(product.productId);
              }
            }
          }
          setFlashSaleProducts(flashSaleProductIds);
        } catch (flashSaleError) {
          console.error('Failed to load flash sale info:', flashSaleError);
        }
        
        // hydrate product details for nicer display
        const ids = cartItems.map(i => i.productId);
        if (ids.length > 0) {
          const entries = await Promise.all(ids.map(async (id) => {
            try {
              const p = await productService.getProductById(id);
              return [id, { name: p.name, image: (p.images && p.images.length > 0 ? p.images[0] : undefined), seller: p.sellerName }] as const;
            } catch (err) {
              console.error(`Failed to load product ${id}:`, err);
              return [id, { name: `Sản phẩm ${id}`, image: undefined, seller: undefined }] as const;
            }
          }));
          const map: Record<string, { name: string; image?: string; seller?: string }> = {};
          entries.forEach(([id, value]) => { map[id] = value; });
          setDetails(map);
        }
      } catch (e) {
        console.error('Failed to load cart', e);
      }
    };
    load();
  }, [user]);

  const updateQuantity = async (productId: string, newQuantity: number) => {
    if (!user) return;
    try {
      let cartData;
      if (newQuantity <= 0) {
        cartData = await cartService.removeItem(user.id, productId);
      } else {
        cartData = await cartService.updateItem(user.id, productId, newQuantity);
      }
      const cartItems = cartData.items || [];
      setItems(cartItems);
      setCart(cartData);
      
      // Refresh flash sale info
      try {
        const activeFlashSales = await flashSaleService.getActiveFlashSales();
        const flashSaleProductIds = new Set<string>();
        for (const flashSale of activeFlashSales) {
          if (flashSale.products) {
            for (const product of flashSale.products) {
              flashSaleProductIds.add(product.productId);
            }
          }
        }
        setFlashSaleProducts(flashSaleProductIds);
      } catch (flashSaleError) {
        console.error('Failed to refresh flash sale info:', flashSaleError);
      }
      
      // Reload product details if new items were added
      const newIds = cartItems.map(i => i.productId).filter(id => !details[id]);
      if (newIds.length > 0) {
        const entries = await Promise.all(newIds.map(async (id) => {
          try {
            const p = await productService.getProductById(id);
            return [id, { name: p.name, image: (p.images && p.images.length > 0 ? p.images[0] : undefined), seller: p.sellerName }] as const;
          } catch (err) {
            console.error(`Failed to load product ${id}:`, err);
            return [id, { name: `Sản phẩm ${id}`, image: undefined, seller: undefined }] as const;
          }
        }));
        setDetails(prev => {
          const updated = { ...prev };
          entries.forEach(([id, value]) => { updated[id] = value; });
          return updated;
        });
      }
    } catch (e) {
      console.error('Update quantity failed', e);
    }
  };

  const removeItem = async (productId: string) => {
    if (!user) return;
    try {
      const cartData = await cartService.removeItem(user.id, productId);
      const cartItems = cartData.items || [];
      setItems(cartItems);
      setCart(cartData);
      
      // Remove from details
      setDetails(prev => {
        const updated = { ...prev };
        delete updated[productId];
        return updated;
      });
    } catch (e) {
      console.error('Remove item failed', e);
    }
  };

  const subtotal = useMemo(() => 
    cart?.subtotal ?? items.reduce((total, item) => total + (item.price * item.quantity), 0), 
    [items, cart]
  );
  const discountAmount = cart?.discountAmount ?? 0;
  const shipping = 30000;
  const total = subtotal - discountAmount + shipping;

  if (items.length === 0) {
    return (
      <AuthGuard>
        <div className="min-h-screen flex flex-col">
          <Header />
          <main className="flex-1 py-8">
            <div className="container mx-auto px-4">
              <div className="text-center py-16">
                <ShoppingCart className="w-24 h-24 mx-auto mb-6 text-muted-foreground" />
                <h2 className="text-2xl font-bold mb-4">Giỏ hàng trống</h2>
                <p className="text-muted-foreground mb-8">Hãy thêm sản phẩm vào giỏ hàng để tiếp tục mua sắm</p>
                <Button asChild>
                  <Link to="/marketplace">Tiếp tục mua sắm</Link>
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
            <h1 className="text-1xl font-bold mb-8">Giỏ hàng của bạn</h1>
          
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {items.map((item) => (
                <Card key={item.productId}>
                  <CardContent className="p-6">
                    <div className="flex gap-4">
                      {details[item.productId]?.image ? (
                        <img
                          src={details[item.productId]?.image}
                          alt={details[item.productId]?.name}
                          className="w-24 h-24 object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-24 h-24 rounded-lg bg-muted flex items-center justify-center text-2xl">🛒</div>
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-lg">{details[item.productId]?.name || `Sản phẩm ${item.productId}`}</h3>
                          {flashSaleProducts.has(item.productId) && (
                            <Badge variant="destructive" className="bg-red-500 text-white animate-pulse">
                              🔥 FLASH SALE
                            </Badge>
                          )}
                        </div>
                        {details[item.productId]?.seller && (
                          <p className="text-sm text-muted-foreground mb-2">Người bán: {details[item.productId]?.seller}</p>
                        )}
                        <p className="text-lg font-bold text-primary">{item.price.toLocaleString()}đ</p>
                      </div>
                      <div className="flex flex-col items-end gap-4">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => removeItem(item.productId)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        <div className="flex items-center border rounded-lg">
                          <button 
                            onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                            className="px-3 py-2 hover:bg-muted"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="px-4 py-2 border-x">{item.quantity}</span>
                          <button 
                            onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                            className="px-3 py-2 hover:bg-muted"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Order Summary */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Tóm tắt đơn hàng</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span>Tạm tính ({items.length} sản phẩm)</span>
                    <span>{subtotal.toLocaleString()}đ</span>
                  </div>
                  {cart?.voucherCode && discountAmount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Giảm giá ({cart.voucherCode})</span>
                      <span>-{discountAmount.toLocaleString()}đ</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Phí vận chuyển</span>
                    <span>{shipping.toLocaleString()}đ</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Tổng cộng</span>
                    <span className="text-primary">{total.toLocaleString()}đ</span>
                  </div>
                  <Button className="w-full" size="lg" asChild>
                    <Link to="/checkout">Tiến hành thanh toán</Link>
                  </Button>
                  <Button variant="outline" className="w-full" asChild>
                    <Link to="/marketplace">Tiếp tục mua sắm</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
    </AuthGuard>
  );
};

export default Cart;