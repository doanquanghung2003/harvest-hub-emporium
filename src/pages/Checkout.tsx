import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MapPin, CreditCard, Truck, Edit, Check } from "lucide-react";
import { AuthGuard } from "@/components/AuthGuard";
import { cartService } from "@/services/cartService";
import { orderService } from "@/services/orderService";
import { paymentService } from "@/services/paymentService";
import { walletService } from "@/services/walletService";
import { bankCardService, type BankCard } from "@/services/bankCardService";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { VoucherSelector } from "@/components/voucher/VoucherSelector";
import { productService } from "@/services/productService";
import { flashSaleService } from "@/services/flashSaleService";

const Checkout = () => {
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [shippingMethod, setShippingMethod] = useState("standard");
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [items, setItems] = useState<{ productId: string; quantity: number; price: number }[]>([]);
  const [productDetails, setProductDetails] = useState<Record<string, { name: string; image?: string; seller?: string }>>({});
  const [userProfile, setUserProfile] = useState<any>(null);
  const [flashSaleProducts, setFlashSaleProducts] = useState<Set<string>>(new Set());
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [bankCards, setBankCards] = useState<BankCard[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string>("");
  const [voucherCode, setVoucherCode] = useState<string>("");
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [shippingAddress, setShippingAddress] = useState({
    fullName: '',
    phone: '',
    address: '',
    city: '',
    district: '',
    ward: '',
    note: ''
  });

  const isAddressComplete = () => {
    const isComplete = Boolean(
      shippingAddress.fullName && shippingAddress.fullName.trim() !== '' &&
      shippingAddress.phone && shippingAddress.phone.trim() !== '' &&
      shippingAddress.address && shippingAddress.address.trim() !== '' &&
      shippingAddress.city && shippingAddress.city.trim() !== '' &&
      shippingAddress.district && shippingAddress.district.trim() !== '' &&
      shippingAddress.ward && shippingAddress.ward.trim() !== ''
    );
    
    // Debug log
    if (!isComplete) {
      console.log('Address validation failed:', {
        fullName: shippingAddress.fullName,
        phone: shippingAddress.phone,
        address: shippingAddress.address,
        city: shippingAddress.city,
        district: shippingAddress.district,
        ward: shippingAddress.ward
      });
    }
    
    return isComplete;
  };

  const getMissingFields = () => {
    const missing: string[] = [];
    if (!shippingAddress.fullName || shippingAddress.fullName.trim() === '') {
      missing.push('Họ tên');
    }
    if (!shippingAddress.phone || shippingAddress.phone.trim() === '') {
      missing.push('Số điện thoại');
    }
    if (!shippingAddress.address || shippingAddress.address.trim() === '') {
      missing.push('Địa chỉ (số nhà, tên đường)');
    }
    if (!shippingAddress.city || shippingAddress.city.trim() === '') {
      missing.push('Tỉnh/Thành phố');
    }
    if (!shippingAddress.district || shippingAddress.district.trim() === '') {
      missing.push('Quận/Huyện');
    }
    if (!shippingAddress.ward || shippingAddress.ward.trim() === '') {
      missing.push('Phường/Xã');
    }
    return missing;
  };

  const getMissingFieldsFromProfile = (userData: any) => {
    const missing: string[] = [];
    if (!userData.firstName || userData.firstName.trim() === '') {
      missing.push('Họ');
    }
    if (!userData.lastName || userData.lastName.trim() === '') {
      missing.push('Tên');
    }
    if (!userData.phoneNumber || userData.phoneNumber.trim() === '') {
      missing.push('Số điện thoại');
    }
    if (!userData.addressStreet || userData.addressStreet.trim() === '') {
      missing.push('Địa chỉ (số nhà, tên đường)');
    }
    if (!userData.addressCity || userData.addressCity.trim() === '') {
      missing.push('Tỉnh/Thành phố');
    }
    if (!userData.addressDistrict || userData.addressDistrict.trim() === '') {
      missing.push('Quận/Huyện');
    }
    if (!userData.addressWard || userData.addressWard.trim() === '') {
      missing.push('Phường/Xã');
    }
    return missing;
  };

  // Load profile data
  const loadProfileData = async () => {
    if (!user) return;
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const profileResponse = await fetch('http://localhost:8081/api/user/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (profileResponse.ok) {
        const userData = await profileResponse.json();
        
        // Debug: Log raw data from API
        console.log('Profile data loaded from API:', userData);
        
        setUserProfile({
          firstName: userData.firstName || '',
          lastName: userData.lastName || '',
          phoneNumber: userData.phoneNumber || '',
          addressStreet: userData.addressStreet || '',
          addressWard: userData.addressWard || '',
          addressDistrict: userData.addressDistrict || '',
          addressCity: userData.addressCity || ''
        });
        
        // Check if address is complete
        const hasCompleteAddress = Boolean(
          userData.firstName && userData.firstName.trim() !== '' &&
          userData.lastName && userData.lastName.trim() !== '' &&
          userData.phoneNumber && userData.phoneNumber.trim() !== '' &&
          userData.addressStreet && userData.addressStreet.trim() !== '' &&
          userData.addressWard && userData.addressWard.trim() !== '' &&
          userData.addressDistrict && userData.addressDistrict.trim() !== '' &&
          userData.addressCity && userData.addressCity.trim() !== ''
        );
        
        // If address is incomplete, redirect to profile page with address tab
        if (!hasCompleteAddress) {
          const missingFields = getMissingFieldsFromProfile(userData);
          const missingText = missingFields.length > 0 
            ? `Thiếu: ${missingFields.join(', ')}`
            : 'Thiếu thông tin cá nhân';
          
          toast({
            title: 'Thiếu thông tin cá nhân',
            description: `Vui lòng cập nhật ${missingText} trước khi mua hàng.`,
            variant: 'destructive'
          });
          navigate('/profile?tab=address');
          return;
        }
        
        // Set default shipping address from profile
        const fullName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
        const newShippingAddress = {
          fullName: fullName || '',
          phone: userData.phoneNumber || '',
          address: userData.addressStreet || '',
          city: userData.addressCity || '',
          district: userData.addressDistrict || '',
          ward: userData.addressWard || '',
          note: ''
        };
        
        setShippingAddress(newShippingAddress);
        
        // Debug log để kiểm tra dữ liệu
        console.log('Shipping address set from profile:', newShippingAddress);
        
        // Validate address completeness manually (don't rely on state update)
        const isComplete = Boolean(
          newShippingAddress.fullName && newShippingAddress.fullName.trim() !== '' &&
          newShippingAddress.phone && newShippingAddress.phone.trim() !== '' &&
          newShippingAddress.address && newShippingAddress.address.trim() !== '' &&
          newShippingAddress.city && newShippingAddress.city.trim() !== '' &&
          newShippingAddress.district && newShippingAddress.district.trim() !== '' &&
          newShippingAddress.ward && newShippingAddress.ward.trim() !== ''
        );
        console.log('Is address complete after setting:', isComplete);
      } else {
        console.error('Failed to load profile:', profileResponse.status);
      }
    } catch (e) {
      console.error('Failed to load profile for checkout', e);
    }
  };

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      try {
        const cart = await cartService.getUserCart(user.id);
        const cartItems = cart?.items || [];
        setItems(cartItems);
        
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
        
        // Load product details for display
        if (cartItems.length > 0) {
          const ids = cartItems.map(i => i.productId);
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
          setProductDetails(map);
        }
        
        // Load user profile from API to get address
        await loadProfileData();
        
        // Load bank cards
        try {
          const cards = await bankCardService.getBankCards(user.id);
          setBankCards(cards);
          // Set default card if available
          const defaultCard = cards.find(c => c.isDefault);
          if (defaultCard) {
            setSelectedCardId(defaultCard.id);
          } else if (cards.length > 0) {
            setSelectedCardId(cards[0].id);
          }
        } catch (e) {
          console.error('Failed to load bank cards', e);
        }
      } catch (e) {
        console.error('Failed to load cart for checkout', e);
      }
    };
    load();
  }, [user, navigate, toast]);

  // Reload profile data when page becomes visible (user might have updated profile)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user) {
        loadProfileData();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user]);

  const subtotal = useMemo(() => items.reduce((acc, i) => acc + i.price * i.quantity, 0), [items]);
  const shipping = shippingMethod === "express" ? 60000 : 30000;
  const finalShipping = discountAmount > 0 && voucherCode ? 0 : shipping; // Free shipping if voucher applied
  const total = subtotal - discountAmount + finalShipping;

  return (
    <AuthGuard>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 py-8">
          <div className="container mx-auto px-4">
            <h1 className="text-3xl font-bold mb-8">Thanh toán</h1>
          
          <div className="grid lg:grid-cols-5 gap-8">
            {/* Order Summary */}
            <div className="lg:col-span-3">
              <Card>
                <CardHeader>
                  <CardTitle>Đơn hàng của bạn</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {items.map((item, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg border">
                        {productDetails[item.productId]?.image ? (
                          <img
                            src={productDetails[item.productId]?.image}
                            alt={productDetails[item.productId]?.name}
                            className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center text-2xl flex-shrink-0">🛒</div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <p className="font-semibold text-sm break-words">
                              {productDetails[item.productId]?.name || `Sản phẩm ${item.productId}`}
                            </p>
                            {flashSaleProducts.has(item.productId) && (
                              <Badge variant="destructive" className="bg-red-500 text-white text-xs animate-pulse flex-shrink-0">
                                🔥 FLASH SALE
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">Số lượng: x{item.quantity}</p>
                        </div>
                        <div className="flex flex-col items-end flex-shrink-0">
                          <span className="font-semibold text-sm whitespace-nowrap">
                            {(item.price * item.quantity).toLocaleString()}đ
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {item.price.toLocaleString()}đ/SP
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Separator />
                  
                  {/* Voucher Section */}
                  <div className="space-y-2">
                    <Label>Voucher</Label>
                    {user && (
                      <VoucherSelector
                        userId={user.id}
                        orderAmount={subtotal}
                        onVoucherSelected={(code, discount) => {
                          setVoucherCode(code);
                          setDiscountAmount(discount);
                        }}
                      />
                    )}
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>Tạm tính</span>
                      <span>{subtotal.toLocaleString()}đ</span>
                    </div>
                    {discountAmount > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Giảm giá</span>
                        <span>-{discountAmount.toLocaleString()}đ</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span>Phí vận chuyển</span>
                      <span>{finalShipping.toLocaleString()}đ</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-lg font-bold">
                      <span>Tổng cộng</span>
                      <span className="text-primary">{total.toLocaleString()}đ</span>
                    </div>
                  </div>
                  
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={async () => {
                      if (!isAddressComplete()) {
                        const missing = getMissingFields();
                        toast({
                          title: "Thiếu thông tin",
                          description: `Vui lòng điền đầy đủ: ${missing.join(", ")}`,
                          variant: "destructive",
                        });
                        return;
                      }
                      
                      setIsLoading(true);
                      try {
                        // Create order using checkout API
                        const orders = await orderService.checkout(user!.id, {
                          paymentMethod: paymentMethod,
                          shippingMethod: shippingMethod,
                          voucherCode: voucherCode || undefined,
                          shippingAddress: {
                            fullName: shippingAddress.fullName,
                            phone: shippingAddress.phone,
                            address: shippingAddress.address,
                            ward: shippingAddress.ward,
                            district: shippingAddress.district,
                            city: shippingAddress.city,
                            note: shippingAddress.note
                          }
                        });
                        
                        if (!orders || orders.length === 0) {
                          throw new Error('Không thể tạo đơn hàng');
                        }
                        
                        const order = orders[0]; // Get first order
                        
                        if (paymentMethod === "cod") {
                          toast({
                            title: "Đặt hàng thành công",
                            description: 'Đơn hàng của bạn đã được tạo. Vui lòng thanh toán khi nhận hàng.',
                          });
                          // Delay để người dùng thấy thông báo trước khi chuyển trang
                          setTimeout(() => {
                            navigate('/orders');
                          }, 1500);
                        } else if (paymentMethod === "wallet") {
                          try {
                            await walletService.payWithWallet(user!.id, total, order.id, `Thanh toán đơn hàng ${order.id}`);
                            toast({
                              title: "Đặt hàng thành công",
                              description: 'Đã thanh toán bằng ví tiền. Đơn hàng của bạn đã được xác nhận.',
                            });
                            // Delay để người dùng thấy thông báo trước khi chuyển trang
                            setTimeout(() => {
                              navigate('/orders');
                            }, 1500);
                          } catch (paymentError: any) {
                            console.error('Payment failed:', paymentError);
                            toast({
                              title: "Thanh toán thất bại",
                              description: paymentError?.message || "Không đủ số dư trong ví hoặc có lỗi xảy ra.",
                              variant: "destructive",
                            });
                            // Vẫn chuyển đến trang đơn hàng vì đơn hàng đã được tạo
                            setTimeout(() => {
                              navigate('/orders');
                            }, 1500);
                          }
                        } else if (paymentMethod === "bank_card") {
                          if (!selectedCardId) {
                            toast({
                              title: "Chưa chọn thẻ",
                              description: "Vui lòng chọn thẻ ngân hàng để thanh toán.",
                              variant: "destructive",
                            });
                            setIsLoading(false);
                            return;
                          }
                          try {
                            const payment = await paymentService.createOnlinePayment({
                              orderId: order.id,
                              userId: user!.id,
                              amount: total,
                              method: 'bank_card',
                              bankCardId: selectedCardId
                            });
                            
                            if (payment.paymentUrl) {
                              // Nếu có payment URL, chuyển đến trang thanh toán
                              window.location.href = payment.paymentUrl;
                            } else {
                              // Thanh toán thành công ngay
                              toast({
                                title: "Đặt hàng thành công",
                                description: 'Đã thanh toán bằng thẻ ngân hàng. Đơn hàng của bạn đã được xác nhận.',
                              });
                              setTimeout(() => {
                                navigate('/orders');
                              }, 1500);
                            }
                          } catch (paymentError: any) {
                            console.error('Payment failed:', paymentError);
                            toast({
                              title: "Thanh toán thất bại",
                              description: paymentError?.message || "Thanh toán thất bại. Vui lòng thử lại.",
                              variant: "destructive",
                            });
                            // Vẫn chuyển đến trang đơn hàng vì đơn hàng đã được tạo
                            setTimeout(() => {
                              navigate('/orders');
                            }, 1500);
                          }
                        } else if (paymentMethod === "qr_pay") {
                          try {
                            const payment = await paymentService.createOnlinePayment({
                              orderId: order.id,
                              userId: user!.id,
                              amount: total,
                              method: 'qr_pay'
                            });
                            
                            if (payment.paymentUrl) {
                              navigate(`/payment/qr?orderId=${order.id}&paymentId=${payment.id}&amount=${total}`);
                            } else {
                              navigate(`/payment/qr/${order.id}`);
                            }
                          } catch (paymentError: any) {
                            console.error('QR payment failed:', paymentError);
                            toast({
                              title: "Lỗi thanh toán",
                              description: paymentError?.message || "Không thể tạo mã QR thanh toán.",
                              variant: "destructive",
                            });
                            // Vẫn chuyển đến trang đơn hàng vì đơn hàng đã được tạo
                            setTimeout(() => {
                              navigate('/orders');
                            }, 1500);
                          }
                        }
                      } catch (error: any) {
                        console.error('Order creation failed:', error);
                        toast({
                          title: "Đặt hàng thất bại",
                          description: error?.message || "Có lỗi xảy ra. Vui lòng thử lại.",
                          variant: "destructive",
                        });
                      } finally {
                        setIsLoading(false);
                      }
                    }}
                    disabled={isLoading || items.length === 0}
                  >
                    {isLoading ? "Đang xử lý..." : "Đặt hàng"}
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-2 space-y-6">
              {/* Shipping Address */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="w-5 h-5" />
                      Địa chỉ giao hàng
                    </CardTitle>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setIsEditingAddress(!isEditingAddress)}
                    >
                      {isEditingAddress ? <Check className="w-4 h-4 mr-2" /> : <Edit className="w-4 h-4 mr-2" />}
                      {isEditingAddress ? 'Xong' : 'Sửa'}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!isEditingAddress ? (
                    // Display address from profile
                    <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">Địa chỉ mặc định</Badge>
                      </div>
                      <div className="space-y-2">
                        <p className="font-medium">{shippingAddress.fullName || 'Chưa có họ tên'}</p>
                        <p className="text-sm text-gray-600">{shippingAddress.phone || 'Chưa có số điện thoại'}</p>
                        <p className="text-sm text-gray-600">
                          {shippingAddress.address && shippingAddress.city ? (
                            <>
                              {shippingAddress.address}, {shippingAddress.ward}, {shippingAddress.district}, {shippingAddress.city}
                            </>
                          ) : 'Chưa có địa chỉ'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    // Edit address form
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="firstName">Họ</Label>
                          <Input 
                            id="firstName" 
                            placeholder="Nhập họ"
                            value={shippingAddress.fullName.split(' ')[0] || ''}
                            onChange={(e) => {
                              const lastName = shippingAddress.fullName.split(' ').slice(1).join(' ');
                              setShippingAddress(prev => ({
                                ...prev,
                                fullName: `${e.target.value} ${lastName}`.trim()
                              }));
                            }}
                          />
                        </div>
                        <div>
                          <Label htmlFor="lastName">Tên</Label>
                          <Input 
                            id="lastName" 
                            placeholder="Nhập tên"
                            value={shippingAddress.fullName.split(' ').slice(1).join(' ') || ''}
                            onChange={(e) => {
                              const firstName = shippingAddress.fullName.split(' ')[0];
                              setShippingAddress(prev => ({
                                ...prev,
                                fullName: `${firstName} ${e.target.value}`.trim()
                              }));
                            }}
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="phone">Số điện thoại</Label>
                        <Input 
                          id="phone" 
                          placeholder="Nhập số điện thoại"
                          value={shippingAddress.phone}
                          onChange={(e) => setShippingAddress(prev => ({ ...prev, phone: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="address">Địa chỉ</Label>
                        <Input 
                          id="address" 
                          placeholder="Số nhà, tên đường"
                          value={shippingAddress.address}
                          onChange={(e) => setShippingAddress(prev => ({ ...prev, address: e.target.value }))}
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="city">Tỉnh/Thành phố</Label>
                          <Input 
                            id="city" 
                            placeholder="Chọn tỉnh/thành"
                            value={shippingAddress.city}
                            onChange={(e) => setShippingAddress(prev => ({ ...prev, city: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="district">Quận/Huyện</Label>
                          <Input 
                            id="district" 
                            placeholder="Chọn quận/huyện"
                            value={shippingAddress.district}
                            onChange={(e) => setShippingAddress(prev => ({ ...prev, district: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="ward">Phường/Xã</Label>
                          <Input 
                            id="ward" 
                            placeholder="Chọn phường/xã"
                            value={shippingAddress.ward}
                            onChange={(e) => setShippingAddress(prev => ({ ...prev, ward: e.target.value }))}
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="note">Ghi chú (tùy chọn)</Label>
                        <Textarea 
                          id="note" 
                          placeholder="Ghi chú thêm cho đơn hàng"
                          value={shippingAddress.note}
                          onChange={(e) => setShippingAddress(prev => ({ ...prev, note: e.target.value }))}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Shipping Method */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="w-5 h-5" />
                    Phương thức vận chuyển
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <RadioGroup value={shippingMethod} onValueChange={setShippingMethod}>
                    <div className="flex items-center space-x-2 p-4 border rounded-lg">
                      <RadioGroupItem value="standard" id="standard" />
                      <Label htmlFor="standard" className="flex-1 cursor-pointer">
                        <div className="flex justify-between">
                          <div>
                            <p className="font-semibold">Giao hàng tiêu chuẩn</p>
                            <p className="text-sm text-muted-foreground">2-3 ngày làm việc</p>
                          </div>
                          <span className="font-semibold">30.000đ</span>
                        </div>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 p-4 border rounded-lg">
                      <RadioGroupItem value="express" id="express" />
                      <Label htmlFor="express" className="flex-1 cursor-pointer">
                        <div className="flex justify-between">
                          <div>
                            <p className="font-semibold">Giao hàng nhanh</p>
                            <p className="text-sm text-muted-foreground">1-2 ngày làm việc</p>
                          </div>
                          <span className="font-semibold">60.000đ</span>
                        </div>
                      </Label>
                    </div>
                  </RadioGroup>
                </CardContent>
              </Card>

              {/* Payment Method */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    Phương thức thanh toán
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                    <div className="flex items-center space-x-2 p-4 border rounded-lg">
                      <RadioGroupItem value="cod" id="cod" />
                      <Label htmlFor="cod" className="flex-1 cursor-pointer">
                        <p className="font-semibold">Thanh toán khi nhận hàng (COD)</p>
                        <p className="text-sm text-muted-foreground">Thanh toán bằng tiền mặt khi nhận hàng</p>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 p-4 border rounded-lg">
                      <RadioGroupItem value="wallet" id="wallet" />
                      <Label htmlFor="wallet" className="flex-1 cursor-pointer">
                        <p className="font-semibold">Ví tiền</p>
                        <p className="text-sm text-muted-foreground">Thanh toán bằng số dư trong ví</p>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 p-4 border rounded-lg">
                      <RadioGroupItem value="bank_card" id="bank_card" />
                      <Label htmlFor="bank_card" className="flex-1 cursor-pointer">
                        <p className="font-semibold">Thẻ ngân hàng</p>
                        <p className="text-sm text-muted-foreground">Thanh toán bằng thẻ ngân hàng đã lưu</p>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 p-4 border rounded-lg">
                      <RadioGroupItem value="qr_pay" id="qr_pay" />
                      <Label htmlFor="qr_pay" className="flex-1 cursor-pointer">
                        <p className="font-semibold">QR Pay</p>
                        <p className="text-sm text-muted-foreground">Quét mã QR để thanh toán</p>
                      </Label>
                    </div>
                  </RadioGroup>
                  
                  {/* Bank Card Selection */}
                  {paymentMethod === "bank_card" && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-3">
                      {bankCards.length === 0 ? (
                        <div className="text-center py-4">
                          <p className="text-sm text-muted-foreground mb-3">
                            Bạn chưa có thẻ ngân hàng nào. Vui lòng thêm thẻ trong trang Ví tiền.
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate('/wallet?tab=cards')}
                          >
                            Thêm thẻ ngân hàng
                          </Button>
                        </div>
                      ) : (
                        <>
                          <Label htmlFor="selectedCard">Chọn thẻ ngân hàng</Label>
                          <Select value={selectedCardId} onValueChange={setSelectedCardId}>
                            <SelectTrigger id="selectedCard">
                              <SelectValue placeholder="Chọn thẻ ngân hàng" />
                            </SelectTrigger>
                            <SelectContent>
                              {bankCards.map((card) => (
                                <SelectItem key={card.id} value={card.id}>
                                  <div className="flex items-center gap-2">
                                    <CreditCard className="h-4 w-4" />
                                    <span>
                                      {card.bankName} - {card.cardNumberMasked || bankCardService.maskCardNumber(card.cardNumber)}
                                      {card.isDefault && " (Mặc định)"}
                                    </span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {selectedCardId && (
                            <div className="text-xs text-muted-foreground">
                              Thẻ được chọn: {bankCards.find(c => c.id === selectedCardId)?.cardHolderName}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
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

export default Checkout;