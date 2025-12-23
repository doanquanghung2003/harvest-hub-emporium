import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  ShoppingCart,
  User,
  Menu,
  Sprout,
  Heart,
  Bell,
  LogOut,
  Package,
  Store,
  Wallet,
  Shield,
  UserCircle,
  Gift
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { cartService } from "@/services/cartService";
import { favoritesService } from "@/services/favoritesService";
import { orderService } from "@/services/orderService";
import { productService } from "@/services/productService";

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || '';

const slugify = (value: string) =>
  (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "";

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { user, isAuthenticated, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation(); // Added useLocation hook
  const [cartCount, setCartCount] = useState<number>(0);
  const [wishCount, setWishCount] = useState<number>(0);
  const [orderCount, setOrderCount] = useState<number>(0);
  const [notificationCount, setNotificationCount] = useState<number>(0);
  const [isSeller, setIsSeller] = useState<boolean>(false);
  const [sellerId, setSellerId] = useState<string | null>(null);
  const [userAvatar, setUserAvatar] = useState<string | undefined>(user?.avatar);
  const [navCategories, setNavCategories] = useState<{ name: string; slug: string }[]>([]);
  // Map category names and slugs to standardized English routes
  const categoryRouteMap: Record<string, string> = {
    // Vietnamese slugs
    "rau-cu": "/categories/vegetables",
    "trai-cay": "/categories/fruits",
    "ngu-coc": "/categories/grains",
    "dung-cu-nong-nghiep": "/categories/farm-tools",
    "dung-cu-nong-san": "/categories/farm-tools",
    "hat-giong": "/categories/seeds",
    // English slugs (direct mapping)
    "vegetables": "/categories/vegetables",
    "fruits": "/categories/fruits",
    "grains": "/categories/grains",
    "farm-tools": "/categories/farm-tools",
    "tools": "/categories/farm-tools",
    "seeds": "/categories/seeds",
  };

  const getCategoryPath = (category: { name: string; slug: string }) => {
    const slug = category.slug || "";
    const normalized = slugify(category.name || slug);
    
    // First try exact slug match
    if (categoryRouteMap[slug]) {
      return categoryRouteMap[slug];
    }
    
    // Then try normalized name match
    if (categoryRouteMap[normalized]) {
      return categoryRouteMap[normalized];
    }
    
    // Fallback: use slug if it exists, otherwise use normalized name
    return `/categories/${slug || normalized}`;
  };

  // Check if current page is seller dashboard
  const isSellerPage = location.pathname.startsWith('/seller');
  const isRoleSeller = user?.role === 'SELLER' || user?.role === 'seller';
  const effectiveIsSeller = isSeller || isRoleSeller;

  // Listen for storage events to update avatar
  useEffect(() => {
    const handleStorageChange = () => {
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        const userObj = JSON.parse(savedUser);
        setUserAvatar(userObj.avatar);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Update avatar when user changes
  useEffect(() => {
    setUserAvatar(user?.avatar);
  }, [user?.avatar]);

  useEffect(() => {
    const fallbackCategories = [
      { name: "Rau củ", slug: "vegetables" },
      { name: "Trái cây", slug: "fruits" },
      { name: "Ngũ cốc", slug: "grains" },
      { name: "Dụng cụ nông nghiệp", slug: "farm-tools" },
      { name: "Hạt giống", slug: "seeds" },
    ];

    const loadCategories = async () => {
      try {
        const categories = await productService.getCategories();
        if (!categories || categories.length === 0) {
          setNavCategories(fallbackCategories);
          return;
        }
        const mapped = categories.map((cat: any) => ({
          name: cat.name || "Danh mục",
          slug: cat.slug || slugify(cat.name || ""),
        }));
        setNavCategories(mapped);
      } catch (error) {
        console.error("Không thể tải danh mục header:", error);
        setNavCategories(fallbackCategories);
      }
    };

    loadCategories();
  }, []);

  useEffect(() => {
    const loadCartCount = async () => {
      try {
        if (!isAuthenticated || !user) { setCartCount(0); return; }
        const cart = await cartService.getUserCart(user.id);
        const count = (cart?.items || []).reduce((s, i) => s + (i.quantity || 0), 0);
        setCartCount(count);
      } catch { setCartCount(0); }
    };
    loadCartCount();

    const onUpdate = () => loadCartCount();
    window.addEventListener('cart:updated', onUpdate as any);
    return () => window.removeEventListener('cart:updated', onUpdate as any);
  }, [isAuthenticated, user]);

  useEffect(() => {
    const loadWish = () => {
      if (!isAuthenticated || !user) { setWishCount(0); return; }
      setWishCount(favoritesService.count(user.id));
    };
    loadWish();
    const onUpdate = () => loadWish();
    window.addEventListener('wishlist:updated', onUpdate as any);
    return () => window.removeEventListener('wishlist:updated', onUpdate as any);
  }, [isAuthenticated, user]);

  useEffect(() => {
    const loadOrderCount = async () => {
      try {
        if (!isAuthenticated || !user) { setOrderCount(0); return; }
        const orders = await orderService.getOrdersByUser(user.id);
        // Count orders that are not delivered and not cancelled
        const count = orders.filter(o => {
          const status = (o.status || '').toLowerCase();
          return status !== 'delivered' && status !== 'cancelled';
        }).length;
        setOrderCount(count);
      } catch { setOrderCount(0); }
    };
    loadOrderCount();
  }, [isAuthenticated, user]);

  useEffect(() => {
    const loadNotificationCount = async () => {
      try {
        if (!isAuthenticated || !user) { setNotificationCount(0); return; }
        const response = await fetch(`${API_BASE_URL}/api/notifications/user/${user.id}`);
        if (!response.ok) {
          // Nếu lỗi 403 hoặc 401, có thể user chưa đăng nhập hoặc không có quyền
          if (response.status === 403 || response.status === 401) {
            setNotificationCount(0);
            return;
          }
          throw new Error('Không thể tải thông báo');
        }
        const notifications = await response.json();
        const unreadCount = notifications.filter((notif: any) => !notif.read).length;
        setNotificationCount(unreadCount);
      } catch (err) {
        console.error('Error loading notification count:', err);
        setNotificationCount(0);
      }
    };
    loadNotificationCount();
  }, [isAuthenticated, user]);

  useEffect(() => {
    const checkSellerStatus = async () => {
      try {
        if (!isAuthenticated || !user?.id) { 
          setIsSeller(false); 
          setSellerId(null);
          return; 
        }
        const response = await fetch(`${API_BASE_URL}/api/sellers/check/${user.id}`);
        if (response.ok) {
          const data = await response.json();
          setIsSeller(data.isSeller === true);
          
          // If user is seller, get seller ID from check response
          if (data.isSeller === true) {
            // Check response might include seller object with ID
            if (data.seller && data.seller.id) {
              setSellerId(data.seller.id);
            } else if (data.sellerId) {
              setSellerId(data.sellerId);
            } else {
              // Fallback: use user.id (might work if seller profile uses user ID)
              console.warn('No seller ID in check response, using user.id as fallback');
              setSellerId(user.id);
            }
          } else {
            setSellerId(null);
          }
        }
      } catch (err) {
        console.error('Error checking seller status:', err);
        setIsSeller(false);
        setSellerId(null);
      }
    };
    checkSellerStatus();
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    if (effectiveIsSeller) {
      setCartCount(0);
      setWishCount(0);
      setOrderCount(0);
      setNotificationCount(0);
    }
  }, [effectiveIsSeller]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleLogout = () => {
    logout();
    // Redirect to home page after logout
    window.location.href = '/';
  };

  return (
    <header className="bg-background border-b border-border sticky top-0 z-50">
      {/* Top banner */}
      <div className="bg-primary text-primary-foreground py-2 text-center text-sm">
        🌾 Miễn phí vận chuyển cho đơn hàng trên 500k | Sản phẩm tươi giao hàng ngày
      </div>

      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <Sprout className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold text-primary">Harvest Hub</span>
          </Link>

          {/* Search bar */}
          <div className="hidden md:flex flex-1 max-w-xl mx-8">
            <form onSubmit={handleSearch} className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                type="search"
                placeholder="Tìm kiếm sản phẩm tươi, hạt giống, dụng cụ..."
                className="pl-10 pr-4 py-2 w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </form>
          </div>

          {/* Navigation icons */}
          <div className="flex items-center space-x-4">
            {isAuthenticated && !effectiveIsSeller && (
              <>
                <Link to="/wishlist">
                  <Button variant="ghost" size="icon" className="relative">
                    <Heart className="h-5 w-5" />
                    <Badge
                      variant="destructive"
                      className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs flex items-center justify-center"
                    >
                      {wishCount}
                    </Badge>
                  </Button>
                </Link>

                <Link to="/notifications">
                  <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {notificationCount > 0 && (
                      <Badge
                        variant="destructive"
                        className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs flex items-center justify-center"
                      >
                        {notificationCount}
                      </Badge>
                    )}
                  </Button>
                </Link>

                <Link to="/cart">
                  <Button variant="ghost" size="icon" className="relative">
                    <ShoppingCart className="h-5 w-5" />
                    <Badge
                      variant="destructive"
                      className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs flex items-center justify-center"
                    >
                      {cartCount}
                    </Badge>
                  </Button>
                </Link>

                <Link to="/orders">
                  <Button variant="ghost" size="icon" className="relative" title="Đơn hàng của tôi">
                    <Package className="h-5 w-5" />
                    <Badge
                      variant="destructive"
                      className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs flex items-center justify-center"
                    >
                      {orderCount}
                    </Badge>
                  </Button>
                </Link>

                <Link to="/wallet">
                  <Button variant="ghost" size="icon" title="Ví tiền">
                    <Wallet className="h-5 w-5" />
                  </Button>
                </Link>

                <Link to="/vouchers">
                  <Button variant="ghost" size="icon" title="Kho voucher">
                    <Gift className="h-5 w-5" />
                  </Button>
                </Link>
              </>
            )}
            {effectiveIsSeller && (
              <>
                <Link to="/seller/dashboard">
                  <Button variant="outline" className="hidden md:inline-flex items-center gap-2">
                    <Store className="h-4 w-4" />
                    Trang bán hàng
                  </Button>
                </Link>
                {sellerId && (
                  <Link to={`/seller/${sellerId}`}>
                    <Button variant="outline" className="hidden md:inline-flex items-center gap-2">
                      <UserCircle className="h-4 w-4" />
                      Xem trang cá nhân
                    </Button>
                  </Link>
                )}
              </>
            )}
            {isAdmin && (
              <Link to="/admin">
                <Button variant="outline" className="hidden md:inline-flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Trang quản trị
                </Button>
              </Link>
            )}
            {/* User menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                {isAuthenticated ? (
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={userAvatar} alt={user?.username} />
                      <AvatarFallback>{user?.username?.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  </Button>
                ) : (
                  <Button variant="ghost" size="icon">
                    <User className="h-5 w-5" />
                  </Button>
                )}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {isAuthenticated ? (
                  <>
                    <DropdownMenuItem>
                      <Link to="/profile" className="flex items-center w-full gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={userAvatar} alt={user?.username} />
                          <AvatarFallback>{user?.username?.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="font-medium">{user?.username}</span>
                          <span className="text-xs text-muted-foreground">{user?.email}</span>
                        </div>
                      </Link>
                    </DropdownMenuItem>
                  </>
                ) : (
                  <DropdownMenuItem>
                    <Link to="/auth" className="flex items-center w-full">
                      <User className="h-4 w-4 mr-2" />
                      Đăng Nhập
                    </Link>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile menu */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Main navigation */}
        <nav className="hidden md:flex space-x-8 py-4">
          {navCategories.map((category) => (
            <Link
              key={category.slug || category.name}
              to={getCategoryPath(category)}
              className="text-foreground hover:text-primary transition-colors capitalize"
            >
              {category.name}
            </Link>
          ))}
          <Link to="/flashsale" className="text-foreground hover:text-primary transition-colors font-semibold text-red-500">
            Flash Sale
          </Link>
          <Link to="/marketplace" className="text-foreground hover:text-primary transition-colors">
            Chợ nông sản
          </Link>
          <Link to="/about" className="text-foreground hover:text-primary transition-colors">
            Giới thiệu
          </Link>
        </nav>

        {/* Mobile search */}
        <div className="md:hidden py-4">
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              type="search"
              placeholder="Tìm kiếm sản phẩm..."
              className="pl-10 pr-4 py-2 w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </form>
        </div>

        {/* Mobile navigation */}
        {
          isMenuOpen && (
            <nav className="md:hidden pb-4 space-y-2">
              {navCategories.map((category) => (
                <Link
                  key={category.slug || category.name}
                  to={getCategoryPath(category)}
                  className="block py-2 text-foreground hover:text-primary transition-colors capitalize"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {category.name}
                </Link>
              ))}
              <Link
                to="/flashsale"
                className="block py-2 text-foreground hover:text-primary transition-colors font-semibold text-red-500"
                onClick={() => setIsMenuOpen(false)}
              >
                Flash Sale
              </Link>
              <Link
                to="/marketplace"
                className="block py-2 text-foreground hover:text-primary transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Chợ nông sản
              </Link>
              <Link
                to="/about"
                className="block py-2 text-foreground hover:text-primary transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Giới thiệu
              </Link>
              {isAuthenticated && !effectiveIsSeller && (
                <Link
                  to="/vouchers"
                  className="block py-2 text-foreground hover:text-primary transition-colors font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Gift className="h-4 w-4 inline mr-2" />
                  Kho voucher
                </Link>
              )}
              {effectiveIsSeller && (
                <>
                  <Link
                    to="/seller/dashboard"
                    className="block py-2 text-foreground hover:text-primary transition-colors font-medium"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Store className="h-4 w-4 inline mr-2" />
                    Trang bán hàng
                  </Link>
                  {sellerId && (
                    <Link
                      to={`/seller/${sellerId}`}
                      className="block py-2 text-foreground hover:text-primary transition-colors font-medium"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <UserCircle className="h-4 w-4 inline mr-2" />
                      Xem trang cá nhân
                    </Link>
                  )}
                </>
              )}
              {isAdmin && (
                <Link
                  to="/admin"
                  className="block py-2 text-foreground hover:text-primary transition-colors font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Shield className="h-4 w-4 inline mr-2" />
                  Trang quản trị
                </Link>
              )}
            </nav>
          )
        }
      </div >
    </header >
  );
}