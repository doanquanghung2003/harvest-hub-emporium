import { useState, useEffect, useMemo } from "react";
import { AdminGuard } from "@/components/AdminGuard";
import { Header } from "@/components/layout/Header";
import { ProductForm } from "@/components/admin/ProductForm";
import { ProductTable } from "@/components/admin/ProductTable";
import { subDays, format } from "date-fns";
import { productService } from "@/services/productService";
import { sellerService, productService as adminProductService, userService, adminOrderService, notificationService } from "@/services/adminService";
import { flashSaleService, FlashSale, FlashSaleProduct } from "@/services/flashSaleService";
import { voucherService, type Voucher } from "@/services/voucherService";
import { Product, ProductFormData, ProductStats } from "@/types/product";
import { VoucherForm } from "@/components/voucher/VoucherForm";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  LineChart as RechartsLineChart,
  Line,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import {
  Users,
  Package,
  ShoppingCart,
  TrendingUp,
  DollarSign,
  Eye,
  Edit,
  Trash2,
  Plus,
  Search,
  Settings,
  Bell,
  BarChart3,
  Tag,
  AlertTriangle,
  CheckCircle,
  Clock,
  X,
  Truck,
  Download,
  Zap,
  Calendar,
  Percent,
  Ticket,
  Gift
} from "lucide-react";

const accountStatusOptions = [
  { value: "ACTIVE", label: "Hoạt động" },
  { value: "VIOLATION", label: "Vi phạm" },
  { value: "RESTRICTED", label: "Hạn chế" },
  { value: "SUSPENDED", label: "Ngừng hoạt động" },
];

const getAccountStatusLabel = (status?: string) => {
  const normalized = (status || "ACTIVE").toUpperCase();
  const option = accountStatusOptions.find(opt => opt.value === normalized);
  return option ? option.label : "Hoạt động";
};

const getAccountStatusBadgeVariant = (status?: string) => {
  const normalized = (status || "ACTIVE").toUpperCase();
  switch (normalized) {
    case "ACTIVE":
      return "default";
    case "VIOLATION":
      return "destructive";
    case "RESTRICTED":
      return "secondary";
    case "SUSPENDED":
      return "outline";
    default:
      return "secondary";
  }
};

type RevenueFilter = "day" | "week" | "month";

const REVENUE_FILTER_LABELS: Record<RevenueFilter, string> = {
  day: "24 giờ gần nhất",
  week: "7 ngày gần nhất",
  month: "30 ngày gần nhất",
};

// Màu sắc cho biểu đồ pie
const PIE_COLORS = [
  "#f97316", // Orange
  "#eab308", // Yellow
  "#84cc16", // Light Green
  "#6b7280", // Grey
  "#3b82f6", // Blue
  "#10b981", // Green
  "#8b5cf6", // Purple
  "#ef4444", // Red
];

const Admin = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [pendingTab, setPendingTab] = useState("sellers");
  const [productApprovalTab, setProductApprovalTab] = useState("manual");
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);

  // Real data states
  const [pendingSellers, setPendingSellers] = useState<any[]>([]);
  const [pendingProducts, setPendingProducts] = useState<any[]>([]);
  const [sellerStats, setSellerStats] = useState<any>({});
  const [productApprovalStats, setProductApprovalStats] = useState<any>({});
  const [loading, setLoading] = useState(false);

  // Product CRUD states
  const [products, setProducts] = useState<Product[]>([]);
  const [productStats, setProductStats] = useState<ProductStats>({
    total: 0,
    active: 0,
    inactive: 0,
    outOfStock: 0,
    pending: 0,
    lowStock: 0,
  });
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [isSubmittingProduct, setIsSubmittingProduct] = useState(false);
  const { toast } = useToast();

  // Accounts management
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState<string>("ALL"); // ALL, USER, SELLER, ADMIN
  const [isViewingUser, setIsViewingUser] = useState(false);
  const [viewingUser, setViewingUser] = useState<any | null>(null);

  // Product names for orders
  const [productNames, setProductNames] = useState<{ [key: string]: string }>({});

  // Product categories for orders
  const [productCategories, setProductCategories] = useState<{ [key: string]: string }>({});

  // Customer names for orders
  const [customerNames, setCustomerNames] = useState<{ [key: string]: string }>({});

  // Flash Sale management states
  const [flashSales, setFlashSales] = useState<FlashSale[]>([]);
  const [loadingFlashSales, setLoadingFlashSales] = useState(false);
  const [showFlashSaleDialog, setShowFlashSaleDialog] = useState(false);
  const [editingFlashSale, setEditingFlashSale] = useState<FlashSale | null>(null);
  const [flashSaleForm, setFlashSaleForm] = useState({
    name: "",
    description: "",
    banner: "",
    startTime: "",
    endTime: "",
    status: "upcoming" as "upcoming" | "active" | "ended" | "cancelled",
    products: [] as Array<{
      productId: string;
      productName: string;
      productImage: string;
      originalPrice: number;
      flashSalePrice: number;
      flashSaleStock: number;
      maxQuantityPerUser: number;
    }>
  });

  // Orders management
  const [ordersData, setOrdersData] = useState<any[]>([]);
  const [loadingOrderId, setLoadingOrderId] = useState<string | null>(null);
  const [platformRevenue, setPlatformRevenue] = useState<number>(0);
  const [customerCount, setCustomerCount] = useState<number>(0);
  const [revenueFilter, setRevenueFilter] = useState<RevenueFilter>("week");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Categories management
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any | null>(null);
  const [isEditingCategory, setIsEditingCategory] = useState(false);
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null);
  const [isDeletingCategory, setIsDeletingCategory] = useState(false);
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '' });

  // Notification sending states
  const [isSendingNotification, setIsSendingNotification] = useState(false);
  const [showSendNotificationDialog, setShowSendNotificationDialog] = useState(false);
  const [notificationForm, setNotificationForm] = useState({
    title: '',
    message: '',
    type: 'INFO' as 'INFO' | 'ORDER' | 'PROMO' | 'SYSTEM',
    target: 'ALL' as 'ALL' | 'CUSTOMERS' | 'SELLERS'
  });

  // Voucher management states
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [voucherStatistics, setVoucherStatistics] = useState<any>(null);
  const [isLoadingVouchers, setIsLoadingVouchers] = useState(false);
  const [showVoucherForm, setShowVoucherForm] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState<Voucher | undefined>();
  const [voucherSearchTerm, setVoucherSearchTerm] = useState("");
  const [voucherStatusFilter, setVoucherStatusFilter] = useState<string>("ALL");

  const fetchAllUsers = async () => {
    try {
      setIsLoadingUsers(true);
      // Load users và sellers song song
      const [usersData, sellersData] = await Promise.all([
        userService.getUsers().catch(() => []),
        sellerService.getAllSellers().catch(() => [])
      ]);

      // Normalize users
      const normalizedUsers = (usersData || []).map((u: any) => ({
        ...u,
        accountStatus: (u.accountStatus || 'ACTIVE').toUpperCase(),
        role: (u.role || 'USER').toUpperCase(),
      }));

      console.log('📊 Users loaded:', normalizedUsers.length);
      console.log('📊 Sellers loaded:', (sellersData || []).length);

      // Convert sellers thành user objects với role SELLER
      const sellerUsers = (sellersData || []).map((seller: any) => {
        // Tìm user tương ứng (nếu có userId)
        const user = seller.userId ? normalizedUsers.find((u: any) => u.id === seller.userId) : null;

        // Nếu có user tương ứng, merge seller info vào user đó
        if (user) {
          return {
            ...user,
            role: 'SELLER', // Đảm bảo role là SELLER
            accountStatus: (seller.status || user.accountStatus || 'ACTIVE').toUpperCase(),
            sellerId: seller.id,
            sellerInfo: seller,
            // Ưu tiên thông tin seller nếu có
            name: seller.businessName || seller.contactPerson || user.name,
            email: seller.email || user.email,
          };
        }

        // Nếu seller có userId nhưng user không tồn tại (đã bị xóa), return null để bỏ qua
        if (seller.userId) {
          return null; // Seller có userId nhưng user đã bị xóa, không hiển thị
        }

        // Nếu seller không có userId, tạo user mới từ seller (seller độc lập)
        return {
          id: `seller_${seller.id}`, // Tạo ID mới cho seller độc lập
          username: seller.email || seller.contactPerson || `seller_${seller.id}`,
          email: seller.email || '',
          name: seller.businessName || seller.contactPerson || 'Unknown Seller',
          role: 'SELLER',
          accountStatus: (seller.status || 'ACTIVE').toUpperCase(),
          sellerId: seller.id,
          sellerInfo: seller,
          createdAt: seller.createdAt,
          updatedAt: seller.updatedAt,
        };
      }).filter((su: any) => su !== null); // Lọc bỏ null (sellers có userId nhưng user đã bị xóa)

      // Merge: Users + Seller Users (loại bỏ duplicate nếu user đã có role SELLER)
      const userMap = new Map();

      // Thêm tất cả users
      normalizedUsers.forEach((u: any) => {
        userMap.set(u.id, u);
      });

      // Thêm seller users (ghi đè nếu user đã tồn tại để cập nhật role SELLER)
      // Chỉ merge sellers nếu user tương ứng còn tồn tại trong normalizedUsers
      sellerUsers.forEach((su: any) => {
        if (su && su.id) {
          const existing = userMap.get(su.id);
          if (existing) {
            // Update role thành SELLER nếu user này là seller
            existing.role = 'SELLER';
            existing.sellerId = su.sellerId;
            existing.sellerInfo = su.sellerInfo;
          } else {
            // Nếu chưa có trong userMap, thêm vào (chỉ áp dụng cho sellers độc lập không có userId)
            // Các sellers có userId đã được merge ở trên, không cần thêm lại
            if (!su.id.startsWith('seller_')) {
              // Nếu id không phải seller_xxx, đó là userId thực nhưng user không tồn tại (đã bị xóa)
              // Không thêm vào userMap
            } else {
              // Seller độc lập (không có userId), thêm vào
              userMap.set(su.id, su);
            }
          }
        }
      });

      const allUsersArray = Array.from(userMap.values());

      // Set tất cả users vào state
      setAllUsers(allUsersArray);

      // Chỉ dùng để đếm customers cho dashboard stats
      const customers = allUsersArray.filter((u: any) => u.role === 'USER' || u.role === 'CUSTOMER');
      setCustomerCount(customers.length);

      console.log('Loaded users:', allUsersArray.length, 'Total roles:', [...new Set(allUsersArray.map((u: any) => u.role))]);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({ title: "Lỗi", description: "Không thể tải danh sách tài khoản", variant: "destructive" });
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const openEditUser = (user: any) => {
    setEditingUser({ ...user, accountStatus: user?.accountStatus || "ACTIVE" });
    setIsEditingUser(true);
  };

  const openViewUser = (user: any) => {
    setViewingUser({ ...user });
    setIsViewingUser(true);
  };

  const submitEditUser = async () => {
    if (!editingUser?.id) return;
    try {
      const userId = editingUser.id;
      await userService.updateUser(userId, {
        username: editingUser.username,
        email: editingUser.email,
        role: editingUser.role,
        firstName: editingUser.firstName,
        lastName: editingUser.lastName,
        phoneNumber: editingUser.phoneNumber,
        accountStatus: editingUser.accountStatus,
      });

      // Cập nhật ngay trong state
      setAllUsers((prev: any[]) =>
        prev.map((u: any) =>
          u.id === userId ? { ...u, ...editingUser } : u
        )
      );

      toast({ title: "Thành công", description: "Đã cập nhật tài khoản" });
      setIsEditingUser(false);
      setEditingUser(null);

      // Refresh sau một chút để đảm bảo dữ liệu đồng bộ
      setTimeout(() => {
        fetchAllUsers();
      }, 500);
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast({
        title: "Lỗi",
        description: error?.message || String(error) || "Không thể cập nhật tài khoản",
        variant: "destructive"
      });
    }
  };

  const openDeleteUser = (id: string) => {
    setDeletingUserId(id);
    setIsDeletingUser(true);
  };

  const confirmDeleteUser = async () => {
    if (!deletingUserId) return;

    try {
      // Tìm user để kiểm tra xem có phải seller không
      const userToDelete = allUsers.find((u: any) => u.id === deletingUserId);
      console.log('🗑️ Deleting user:', deletingUserId, 'User info:', userToDelete);

      // Xóa user từ backend (backend sẽ tự động xóa seller nếu có)
      await userService.deleteUser(deletingUserId);
      console.log('✅ User deleted from backend');

      // Xóa ngay khỏi state để UI cập nhật ngay lập tức
      setAllUsers((prev: any[]) => {
        const filtered = prev.filter((u: any) => {
          // Xóa user đang xóa
          if (u.id === deletingUserId) {
            console.log('🗑️ Filtering out user:', u.id);
            return false;
          }

          // Xóa seller có cùng sellerId với user đang xóa
          if (userToDelete?.sellerId && u.sellerId === userToDelete.sellerId) {
            console.log('🗑️ Filtering out seller with sellerId:', u.sellerId);
            return false;
          }

          // Nếu seller có userId và userId = deletingUserId, không hiển thị
          // (seller.info.userId hoặc seller.userId)
          if (u.sellerInfo && u.sellerInfo.userId === deletingUserId) {
            console.log('🗑️ Filtering out seller with userId:', u.sellerInfo.userId);
            return false;
          }

          return true;
        });
        console.log('📊 Users after delete from state:', filtered.length, 'Original:', prev.length);
        return filtered;
      });

      toast({ title: "Thành công", description: "Đã xóa tài khoản" });
      setIsDeletingUser(false);
      setDeletingUserId(null);

      // Refresh sau delay để đảm bảo backend đã xử lý xong và sellers đã bị xóa
      setTimeout(() => {
        console.log('🔄 Refreshing users list...');
        fetchAllUsers();
      }, 1000);
    } catch (error: any) {
      console.error('❌ Error deleting user:', error);
      toast({
        title: "Lỗi",
        description: error?.message || String(error) || "Không thể xóa tài khoản",
        variant: "destructive"
      });
      setIsDeletingUser(false);
      setDeletingUserId(null);
    }
  };

  // Send notification to all users
  const sendNotificationToAllUsers = async () => {
    if (!notificationForm.title.trim() || !notificationForm.message.trim()) {
      toast({ title: "Lỗi", description: "Vui lòng điền đầy đủ tiêu đề và nội dung", variant: "destructive" });
      return;
    }

    try {
      setIsSendingNotification(true);

      // Gửi thông báo đến backend API
      const result = await notificationService.sendToAllUsers({
        title: notificationForm.title,
        message: notificationForm.message,
        type: notificationForm.type,
        target: notificationForm.target
      });

      toast({
        title: "Thành công",
        description: result.message || "Đã gửi thông báo đến tất cả người dùng"
      });

      // Reset form and close dialog
      setNotificationForm({ title: '', message: '', type: 'INFO', target: 'ALL' });
      setShowSendNotificationDialog(false);

      // Reload notifications from database
      const loadNotifications = async () => {
        try {
          const allNotifications = await notificationService.getNotifications();
          const transformedNotifications = allNotifications
            .map((notif: any) => ({
              id: notif.id,
              title: notif.title,
              message: notif.message,
              type: notif.type.toLowerCase(),
              isRead: notif.read,
              created: new Date(notif.createdAt).toLocaleString('vi-VN')
            }))
            .sort((a: any, b: any) => {
              const dateA = new Date(allNotifications.find((n: any) => n.id === a.id)?.createdAt || 0).getTime();
              const dateB = new Date(allNotifications.find((n: any) => n.id === b.id)?.createdAt || 0).getTime();
              return dateB - dateA;
            });
          setNotifications(transformedNotifications);
        } catch (e) {
          console.error('Failed to reload notifications', e);
        }
      };
      loadNotifications();

    } catch (error: any) {
      console.error('Error sending notification:', error);
      toast({
        title: "Lỗi",
        description: error?.message || "Không thể gửi thông báo",
        variant: "destructive"
      });
    } finally {
      setIsSendingNotification(false);
    }
  };

  // Fetch real data functions
  const fetchPendingSellers = async () => {
    try {
      setLoading(true);
      const data = await sellerService.getPendingSellers();
      setPendingSellers(data);
    } catch (error) {
      console.error('Error fetching pending sellers:', error);
      toast({
        title: "Lỗi",
        description: "Không thể tải danh sách đăng ký bán hàng",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingProducts = async () => {
    try {
      setLoading(true);
      const data = await adminProductService.getPendingProducts();
      setPendingProducts(data);
    } catch (error) {
      console.error('Error fetching pending products:', error);
      toast({
        title: "Lỗi",
        description: "Không thể tải danh sách sản phẩm chờ duyệt",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSellerStats = async () => {
    try {
      const data = await sellerService.getSellerStats();
      setSellerStats(data);
    } catch (error) {
      console.error('Error fetching seller stats:', error);
    }
  };

  const fetchProductStats = async () => {
    try {
      const data = await adminProductService.getProductStats();
      setProductApprovalStats(data);
    } catch (error) {
      console.error('Error fetching product stats:', error);
    }
  };

  // Load data when component mounts or tab changes
  useEffect(() => {
    if (activeTab === "pending-products") {
      fetchPendingSellers();
      fetchPendingProducts();
      fetchSellerStats();
      fetchProductStats();
    }
    if (activeTab === "accounts") {
      fetchAllUsers();
    }
    if (activeTab === "orders") {
      loadOrders();
    }
    if (activeTab === "dashboard") {
      // Tải số lượng người dùng (khách hàng) để hiển thị đúng thống kê
      fetchAllUsers();
      // Tải đơn để có số đơn và doanh thu nền tảng mới nhất
      loadOrders();
      // Tải toàn bộ sản phẩm và thống kê sản phẩm để thẻ "Sản phẩm" phản ánh toàn hệ thống
      loadProducts();
      loadProductStats();
    }
    if (activeTab === "categories") {
      fetchCategories();
    }
    if (activeTab === "flashsale") {
      loadFlashSales();
    }
    if (activeTab === "vouchers") {
      loadVouchers();
      loadVoucherStatistics();
    }
  }, [activeTab]);

  const loadVouchers = async () => {
    try {
      setIsLoadingVouchers(true);
      const data = await voucherService.getAllVouchers();
      setVouchers(data);
    } catch (error) {
      console.error('Error loading vouchers:', error);
      toast({
        title: "Lỗi",
        description: "Không thể tải danh sách voucher",
        variant: "destructive",
      });
    } finally {
      setIsLoadingVouchers(false);
    }
  };

  const loadVoucherStatistics = async () => {
    try {
      const stats = await voucherService.getVoucherStatistics();
      setVoucherStatistics(stats);
    } catch (error) {
      console.error('Error loading voucher statistics:', error);
    }
  };

  const loadFlashSales = async () => {
    try {
      setLoadingFlashSales(true);
      const allFlashSales = await flashSaleService.getAllFlashSales();
      setFlashSales(allFlashSales);
    } catch (error) {
      console.error('Error loading flash sales:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể tải danh sách flash sale',
        variant: 'destructive',
      });
    } finally {
      setLoadingFlashSales(false);
    }
  };

  // Load notifications and orders
  useEffect(() => {
    const loadNotifications = async () => {
      try {
        // Load all notifications from database
        const allNotifications = await notificationService.getNotifications();

        // Transform để match với format hiện tại của admin page
        const transformedNotifications = allNotifications
          .map((notif: any) => ({
            id: notif.id,
            title: notif.title,
            message: notif.message,
            type: notif.type.toLowerCase(),
            isRead: notif.read,
            created: new Date(notif.createdAt).toLocaleString('vi-VN')
          }))
          .sort((a: any, b: any) => {
            // Sort by createdAt descending (newest first)
            const dateA = new Date(allNotifications.find((n: any) => n.id === a.id)?.createdAt || 0).getTime();
            const dateB = new Date(allNotifications.find((n: any) => n.id === b.id)?.createdAt || 0).getTime();
            return dateB - dateA;
          });

        setNotifications(transformedNotifications);
      } catch (e) {
        // Silently fail - notifications are optional
        // Don't log error to avoid console spam
        setNotifications([]);
      }
    };

    loadNotifications();
  }, []);

  // Load users when accounts tab is opened
  useEffect(() => {
    if (activeTab === "accounts" && allUsers.length === 0) {
      fetchAllUsers();
    }
  }, [activeTab]);

  // Handle approve/reject actions
  const handleApproveSeller = async (sellerId: string) => {
    try {
      const result = await sellerService.approveSeller(sellerId, "admin-1");
      if (result.success) {
        toast({
          title: "Thành công",
          description: "Đã duyệt đăng ký bán hàng và cập nhật role thành SELLER",
        });
        fetchPendingSellers();
        fetchSellerStats();
        // Refresh danh sách user để cập nhật role
        fetchAllUsers();
      }
    } catch (error) {
      console.error('Error approving seller:', error);
      toast({
        title: "Lỗi",
        description: "Không thể duyệt đăng ký",
        variant: "destructive",
      });
    }
  };

  const handleRejectSeller = async (sellerId: string, reason?: string) => {
    try {
      const result = await sellerService.rejectSeller(sellerId, "admin-1", reason);
      if (result.success) {
        toast({
          title: "Thành công",
          description: "Đã từ chối đăng ký bán hàng",
        });
        fetchPendingSellers();
        fetchSellerStats();
      }
    } catch (error) {
      console.error('Error rejecting seller:', error);
      toast({
        title: "Lỗi",
        description: "Không thể từ chối đăng ký",
        variant: "destructive",
      });
    }
  };

  const handleApproveProduct = async (productId: string) => {
    try {
      const result = await adminProductService.approveProduct(productId, "admin-1");
      if (result.success) {
        toast({
          title: "Thành công",
          description: "Đã duyệt sản phẩm",
        });
        fetchPendingProducts();
        fetchProductStats();
      }
    } catch (error) {
      console.error('Error approving product:', error);
      toast({
        title: "Lỗi",
        description: "Không thể duyệt sản phẩm",
        variant: "destructive",
      });
    }
  };

  const handleRejectProduct = async (productId: string, reason?: string) => {
    try {
      const result = await adminProductService.rejectProduct(productId, "admin-1", reason);
      if (result.success) {
        toast({
          title: "Thành công",
          description: "Đã từ chối sản phẩm",
        });
        fetchPendingProducts();
        fetchProductStats();
      }
    } catch (error) {
      console.error('Error rejecting product:', error);
      toast({
        title: "Lỗi",
        description: "Không thể từ chối sản phẩm",
        variant: "destructive",
      });
    }
  };

  // Mock data for other sections
  const formatCurrency = (amount: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);

  const totalAccounts = allUsers.length > 0 ? allUsers.length : customerCount;

  const stats = [
    { title: "Tổng người dùng", value: totalAccounts.toString(), icon: Users, trend: "+12%", targetTab: "accounts" },
    { title: "Sản phẩm", value: productStats.total.toString(), icon: Package, trend: "+5%", targetTab: "products" },
    { title: "Đơn hàng", value: (ordersData?.length || 0).toString(), icon: ShoppingCart, trend: "+18%", targetTab: "orders-completed" },
    { title: "Doanh thu", value: formatCurrency(platformRevenue), icon: DollarSign, trend: "+25%", targetTab: "analytics" },
  ];

  const handleStatCardClick = (targetTab?: string) => {
    if (targetTab) {
      setActiveTab(targetTab);
    }
  };

  const completedOrders = useMemo(() => {
    const completedStatuses = new Set(["delivered", "completed"]);
    return ordersData.filter((order: any) =>
      completedStatuses.has(String(order.status || "").toLowerCase())
    );
  }, [ordersData]);

  const getOrderTotalValue = (order: any) => Number(order?.totalPrice ?? order?.totalAmount ?? 0);

  const getOrderTimestamp = (order: any) => {
    const candidate = order?.completedAt || order?.deliveredAt || order?.updatedAt || order?.createdAt;
    if (!candidate) return null;
    const parsed = new Date(candidate);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const filteredOrdersByRange = useMemo(() => {
    if (!ordersData?.length) return [];
    const now = new Date();
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    const start = new Date(now);
    if (revenueFilter === "day") {
      start.setHours(0, 0, 0, 0);
    } else if (revenueFilter === "week") {
      const from = subDays(now, 6);
      from.setHours(0, 0, 0, 0);
      start.setTime(from.getTime());
    } else {
      const from = subDays(now, 29);
      from.setHours(0, 0, 0, 0);
      start.setTime(from.getTime());
    }
    return ordersData.filter((order: any) => {
      const timestamp = getOrderTimestamp(order);
      if (!timestamp) return false;
      return timestamp >= start && timestamp <= end;
    });
  }, [ordersData, revenueFilter]);

  const revenueTimelineData = useMemo(() => {
    if (revenueFilter === "day") {
      const hourlyBuckets = Array.from({ length: 24 }, (_, hour) => ({
        label: `${hour.toString().padStart(2, "0")}:00`,
        revenue: 0,
        orders: 0,
      }));
      filteredOrdersByRange.forEach((order: any) => {
        const timestamp = getOrderTimestamp(order);
        if (!timestamp) return;
        const amount = getOrderTotalValue(order);
        const hour = timestamp.getHours();
        hourlyBuckets[hour].revenue += amount;
        hourlyBuckets[hour].orders += 1;
      });
      return hourlyBuckets;
    }
    const now = new Date();
    const days = revenueFilter === "week" ? 7 : 30;
    const buckets: Record<string, { label: string; revenue: number; orders: number }> = {};
    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(now, i);
      const key = format(date, "yyyy-MM-dd");
      buckets[key] = {
        label: format(date, "dd/MM"),
        revenue: 0,
        orders: 0,
      };
    }
    filteredOrdersByRange.forEach((order: any) => {
      const timestamp = getOrderTimestamp(order);
      if (!timestamp) return;
      const key = format(timestamp, "yyyy-MM-dd");
      if (!buckets[key]) return;
      buckets[key].revenue += getOrderTotalValue(order);
      buckets[key].orders += 1;
    });
    return Object.values(buckets);
  }, [filteredOrdersByRange, revenueFilter]);

  // Dữ liệu cho biểu đồ pie - tỷ lệ đơn hàng theo danh mục
  const revenuePieData = useMemo(() => {
    if (!filteredOrdersByRange.length) return [];
    // Chỉ tính các đơn hàng đã giao thành công (delivered/completed)
    const completedOrders = filteredOrdersByRange.filter((order: any) => {
      const status = String(order?.status || '').toLowerCase();
      return status === 'delivered' || status === 'completed';
    });
    
    if (!completedOrders.length) return [];
    
    // Đếm số đơn hàng thành công theo từng danh mục
    // Mỗi đơn hàng được phân loại vào danh mục có nhiều sản phẩm nhất trong đơn
    const categoryOrderCounts = new Map<string, number>();
    
    completedOrders.forEach((order: any) => {
      const items = Array.isArray(order?.items) ? order.items : [];
      if (!items.length) {
        categoryOrderCounts.set("Khác", (categoryOrderCounts.get("Khác") || 0) + 1);
        return;
      }
      
      // Đếm số lượng sản phẩm theo từng danh mục trong đơn hàng này
      const categoryCountsInOrder = new Map<string, number>();
      const validCategories: string[] = [];
      
      items.forEach((item: any) => {
        // Lấy productId để tìm category từ productCategories map
        const productId = item?.productId || item?.id || item?.product?.id || null;
        
        // Ưu tiên lấy category từ productCategories map (đã load từ database)
        let category = productId ? productCategories[productId] : null;
        
        // Nếu không có trong map, thử lấy từ item trực tiếp
        if (!category) {
          category =
            item?.categorySnapshot ||
            item?.category ||
            item?.categoryName ||
            item?.productCategory ||
            item?.product?.category ||
            item?.product?.categoryName ||
            (item?.product?.categoryObj && (item.product.categoryObj.name || item.product.categoryObj.categoryName)) ||
            null;
        }
        
        // Normalize category - loại bỏ giá trị không hợp lệ
        if (category) {
          if (typeof category === 'string') {
            category = category.trim();
            // Loại bỏ các giá trị không hợp lệ
            if (category === '' || category === 'null' || category === 'undefined' || category.toLowerCase() === 'khác') {
              category = null;
            }
          } else if (typeof category === 'object' && category !== null) {
            // Nếu category là object, lấy name
            category = category.name || category.categoryName || null;
          }
        }
        
        // Chỉ dùng "Khác" nếu thực sự không có category nào
        if (!category) {
          // Debug: log item không có category
          console.log('Item without category:', {
            productId,
            item: item,
            productCategoriesMap: productCategories,
            hasProductId: !!productId,
            categoryFromMap: productId ? productCategories[productId] : null
          });
          category = "Khác";
        } else {
          // Lưu danh mục hợp lệ
          if (!validCategories.includes(category)) {
            validCategories.push(category);
          }
        }
        
        const quantity = Number(item?.quantity ?? 1);
        const itemQuantity = Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
        categoryCountsInOrder.set(category, (categoryCountsInOrder.get(category) || 0) + itemQuantity);
      });
      
      // Tìm danh mục có nhiều sản phẩm nhất trong đơn hàng này
      // Ưu tiên danh mục hợp lệ (không phải "Khác") nếu có
      let maxCount = 0;
      let dominantCategory = "Khác";
      
      categoryCountsInOrder.forEach((count, category) => {
        if (count > maxCount) {
          maxCount = count;
          dominantCategory = category;
        }
      });
      
      // Nếu danh mục chính là "Khác" nhưng có danh mục hợp lệ khác, ưu tiên danh mục hợp lệ
      if (dominantCategory === "Khác" && validCategories.length > 0) {
        let maxValidCount = 0;
        let validDominantCategory = validCategories[0];
        validCategories.forEach(cat => {
          const count = categoryCountsInOrder.get(cat) || 0;
          if (count > maxValidCount) {
            maxValidCount = count;
            validDominantCategory = cat;
          }
        });
        if (maxValidCount > 0) {
          dominantCategory = validDominantCategory;
        }
      }
      
      categoryOrderCounts.set(dominantCategory, (categoryOrderCounts.get(dominantCategory) || 0) + 1);
    });
    
    const sorted = Array.from(categoryOrderCounts.entries()).sort((a, b) => b[1] - a[1]);
    const result = sorted.map(([name, orderCount]) => ({ 
      name, 
      value: orderCount
    }));
    
    // Debug: log kết quả để kiểm tra
    console.log('Pie Chart Data:', result);
    console.log('Category counts:', Array.from(categoryOrderCounts.entries()));
    console.log('Product Categories Map:', productCategories);
    
    return result;
  }, [filteredOrdersByRange, productCategories]);

  const totalPieValue = useMemo(
    () => revenuePieData.reduce((sum, slice) => sum + slice.value, 0),
    [revenuePieData]
  );

  const hasPieData = revenuePieData.some((slice) => slice.value > 0);

  const pieChartConfig: ChartConfig = {
    value: {
      label: "Tỷ lệ đơn hàng theo danh mục",
      color: "hsl(var(--primary))",
    },
  };

  const totalRevenueInRange = useMemo(
    () => filteredOrdersByRange.reduce((sum, order) => sum + getOrderTotalValue(order), 0),
    [filteredOrdersByRange]
  );
  const totalOrdersInRange = filteredOrdersByRange.length;
  const averageOrderValueRange = totalOrdersInRange > 0 ? totalRevenueInRange / totalOrdersInRange : 0;

  // Top sản phẩm bán chạy từ các đơn hàng đã giao thành công theo bộ lọc
  const topSellingProducts = useMemo(() => {
    // Chỉ tính các đơn hàng đã giao thành công
    const completedOrders = filteredOrdersByRange.filter((order: any) => {
      const status = String(order?.status || '').toLowerCase();
      return status === 'delivered' || status === 'completed';
    });

    if (!completedOrders.length) return [];

    // Đếm số lượng bán được của từng sản phẩm và tính tổng doanh thu
    const productSales = new Map<string, { name: string; category: string; totalRevenue: number; quantity: number }>();

    completedOrders.forEach((order: any) => {
      const items = Array.isArray(order?.items) ? order.items : [];
      items.forEach((item: any) => {
        const productId = item?.productId || item?.id || item?.product?.id || `unknown-${item.name || Math.random()}`;
        const productName = item?.productName || item?.name || item?.nameSnapshot || item?.product?.name || 'Sản phẩm';
        
        // Lấy category từ productCategories map hoặc từ item
        let category = productId ? productCategories[productId] : null;
        if (!category) {
          category = item?.categorySnapshot || item?.category || item?.categoryName || item?.productCategory || item?.product?.category || 'Khác';
        }
        
        // Lấy giá từ nhiều nguồn có thể
        const rawPrice = item?.price ?? item?.priceSnapshot ?? item?.priceAtPurchase ?? item?.unitPrice ?? item?.product?.price ?? 0;
        const price = Number(rawPrice);
        const quantity = Number(item?.quantity ?? 1);
        const itemRevenue = price > 0 ? price * quantity : 0;

        if (productSales.has(productId)) {
          const existing = productSales.get(productId)!;
          existing.quantity += quantity;
          existing.totalRevenue += itemRevenue;
        } else {
          productSales.set(productId, {
            name: productName,
            category: category,
            totalRevenue: itemRevenue,
            quantity: quantity,
          });
        }
      });
    });

    // Tính giá trung bình cho mỗi sản phẩm và sắp xếp theo số lượng bán được (giảm dần)
    let result = Array.from(productSales.values())
      .map(product => ({
        ...product,
        price: product.quantity > 0 ? product.totalRevenue / product.quantity : 0, // Giá trung bình
      }))
      .filter(product => product.price > 0); // Chỉ lấy sản phẩm có giá hợp lệ
    
    // Lọc theo category được chọn nếu có
    if (selectedCategory) {
      result = result.filter(product => product.category === selectedCategory);
    }
    
    return result
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);
  }, [filteredOrdersByRange, productCategories, selectedCategory]);

  const revenueChartConfig: ChartConfig = {
    revenue: {
      label: "Doanh thu",
      color: "hsl(var(--primary))",
    },
    orders: {
      label: "Đơn hàng",
      color: "hsl(var(--muted-foreground))",
    },
  };

  const orderChartConfig: ChartConfig = {
    orders: {
      label: "Đơn hàng",
      color: "hsl(var(--primary))",
    },
  };

  const hasRevenueTimelineData = revenueTimelineData.some((point) => point.revenue > 0 || point.orders > 0);

  const handleExportRevenue = () => {
    if (!filteredOrdersByRange.length) {
      toast({
        title: "Chưa có dữ liệu",
        description: "Không có đơn hàng nào trong khoảng thời gian đã chọn.",
        variant: "destructive",
      });
      return;
    }
    const headers = ["Mã đơn", "Ngày tạo", "Trạng thái", "Tổng tiền (VND)"];
    const rows = filteredOrdersByRange.map((order: any) => {
      const timestamp = getOrderTimestamp(order);
      return [
        order?.id || "",
        timestamp ? timestamp.toLocaleString("vi-VN") : "N/A",
        order?.status || "N/A",
        formatCurrency(getOrderTotalValue(order)),
      ];
    });
    const tableHtml = [headers, ...rows]
      .map(
        (row) =>
          `<tr>${row
            .map(
              (cell) =>
                `<td style="mso-number-format:'\\@';padding:4px 8px;border:1px solid #e5e7eb;">${String(cell ?? "")}</td>`
            )
            .join("")}</tr>`
      )
      .join("");
    const blob = new Blob([`<table>${tableHtml}</table>`], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `revenue_${revenueFilter}_${new Date().toISOString().slice(0, 10)}.xls`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
    toast({
      title: "Đã xuất file",
      description: `Tải xuống ${rows.length} đơn hàng.`,
    });
  };

  const users = [
    { id: 1, name: "Nguyễn Văn A", email: "nguyenvana@example.com", role: "customer", status: "active", joined: "2024-01-10" },
    { id: 2, name: "Trần Thị B", email: "tranthib@example.com", role: "seller", status: "active", joined: "2024-01-08" },
    { id: 3, name: "Lê Văn C", email: "levanc@example.com", role: "customer", status: "inactive", joined: "2024-01-05" },
  ];

  const fetchCategories = async () => {
    try {
      setIsLoadingCategories(true);
      const data = await productService.getCategories();
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast({
        title: "Lỗi",
        description: "Không thể tải danh sách danh mục",
        variant: "destructive",
      });
    } finally {
      setIsLoadingCategories(false);
    }
  };

  const handleAddCategory = async () => {
    if (!categoryForm.name.trim()) {
      toast({ title: "Lỗi", description: "Vui lòng nhập tên danh mục", variant: "destructive" });
      return;
    }
    try {
      await productService.createCategory(categoryForm);
      toast({ title: "Thành công", description: "Đã thêm danh mục mới" });
      setCategoryForm({ name: '', description: '' });
      setIsAddingCategory(false);
      fetchCategories();
    } catch (error: any) {
      toast({ title: "Lỗi", description: error?.message || "Không thể thêm danh mục", variant: "destructive" });
    }
  };

  const handleEditCategory = async () => {
    if (!editingCategory?.name?.trim()) {
      toast({ title: "Lỗi", description: "Vui lòng nhập tên danh mục", variant: "destructive" });
      return;
    }
    try {
      await productService.updateCategory(editingCategory.id, {
        name: editingCategory.name,
        description: editingCategory.description
      });
      toast({ title: "Thành công", description: "Đã cập nhật danh mục" });
      setIsEditingCategory(false);
      setEditingCategory(null);
      fetchCategories();
    } catch (error: any) {
      toast({ title: "Lỗi", description: error?.message || "Không thể cập nhật danh mục", variant: "destructive" });
    }
  };

  const handleDeleteCategory = async () => {
    if (!deletingCategoryId) return;
    try {
      await productService.deleteCategory(deletingCategoryId);
      toast({ title: "Thành công", description: "Đã xóa danh mục" });
      setIsDeletingCategory(false);
      setDeletingCategoryId(null);
      fetchCategories();
    } catch (error: any) {
      toast({ title: "Lỗi", description: error?.message || "Không thể xóa danh mục", variant: "destructive" });
    }
  };



  const [notifications, setNotifications] = useState([]);
  const [deletingNotificationId, setDeletingNotificationId] = useState<string | null>(null);

  const analytics = {
    todayRevenue: "₫2,450,000",
    weeklyGrowth: "+15%",
    monthlyOrders: 156,
    customerGrowth: "+8%",
    topSellingCategory: "Rau củ",
    averageOrderValue: "₫145,000"
  };

  const handleMarkNotificationAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map((n: any) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const handleMarkAllNotifications = () => {
    setNotifications(prev => prev.map((n: any) => ({ ...n, isRead: true })));
  };

  const handleDeleteNotification = async (id: string) => {
    if (!id) return;
    try {
      setDeletingNotificationId(id);
      await notificationService.deleteNotification(id);
      setNotifications(prev => prev.filter((n: any) => n.id !== id));
      toast({ title: "Thành công", description: "Đã xóa thông báo" });
    } catch (error: any) {
      console.error("Failed to delete notification", error);
      toast({ title: "Lỗi", description: "Không thể xóa thông báo", variant: "destructive" });
    } finally {
      setDeletingNotificationId(null);
    }
  };

  // Load products on component mount and when activeTab changes
  useEffect(() => {
    if (activeTab === "products") {
      loadProducts();
    }
  }, [activeTab]);

  // Load stats when products change
  useEffect(() => {
    if (activeTab === "products") {
      loadProductStats();
    }
  }, [products, activeTab]);



  const loadProducts = async () => {
    try {
      setIsLoadingProducts(true);

      // Try to load from API first
      try {
        console.log('Attempting to load products from API...');
        const fetchedProducts = await productService.getProducts();
        console.log('Successfully loaded products from API:', fetchedProducts);
        // Đảm bảo fetchedProducts là array (xử lý cả PageResponse và array trực tiếp)
        const productsArray = Array.isArray(fetchedProducts) ? fetchedProducts : (fetchedProducts?.content || []);
        setProducts(productsArray);
      } catch (apiError) {
        console.log('API not available, using mock data. Error:', apiError);
        // Fallback to mock data if API is not available
        const mockProducts: Product[] = [
          {
            id: "1",
            name: "Gạo ST25",
            description: "Gạo ST25 thơm ngon, chất lượng cao",
            shortDescription: "Gạo thơm ngon",
            category: "grains",
            price: 25000,
            originalPrice: 30000,
            stock: 150,
            images: ["data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2YzZjRmNiIvPjx0ZXh0IHg9IjE1MCIgeT0iMTUwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IiM2YjcyODAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5H4bqhbyBTVDI1PC90ZXh0Pjwvc3ZnPg=="],
            detailImages: [],
            tags: ["gạo", "thơm", "chất lượng cao"],
            status: "active",
            sellerId: "seller1",
            sellerName: "Nông trại ABC",
            rating: 4.5,
            reviewCount: 25,
            soldCount: 120,
            weight: 5000,
            dimensions: { length: 30, width: 20, height: 10 },
            specifications: { "Loại gạo": "ST25", "Xuất xứ": "Sóc Trăng" },
            createdAt: "2024-01-15T10:00:00Z",
            updatedAt: "2024-01-15T10:00:00Z"
          },
          {
            id: "2",
            name: "Cà chua Đà Lạt",
            description: "Cà chua Đà Lạt tươi ngon, không hóa chất",
            shortDescription: "Cà chua tươi",
            category: "vegetables",
            price: 15000,
            originalPrice: 18000,
            stock: 80,
            images: ["data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2YzZjRmNiIvPjx0ZXh0IHg9IjE1MCIgeT0iMTUwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IiM2YjcyODAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5Dw6AgY2h1YTwvdGV4dD48L3N2Zz4="],
            detailImages: [],
            tags: ["cà chua", "tươi", "không hóa chất"],
            status: "active",
            sellerId: "seller2",
            sellerName: "Vườn rau Đà Lạt",
            rating: 4.2,
            reviewCount: 18,
            soldCount: 95,
            weight: 500,
            dimensions: { length: 8, width: 6, height: 6 },
            specifications: { "Xuất xứ": "Đà Lạt", "Trọng lượng": "500g/kg" },
            createdAt: "2024-01-14T09:00:00Z",
            updatedAt: "2024-01-14T09:00:00Z"
          },
          {
            id: "3",
            name: "Xoài cát Hòa Lộc",
            description: "Xoài cát Hòa Lộc ngọt lịm, thịt dày",
            shortDescription: "Xoài ngọt",
            category: "fruits",
            price: 35000,
            originalPrice: 40000,
            stock: 45,
            images: ["data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2YzZjRmNiIvPjx0ZXh0IHg9IjE1MCIgeT0iMTUwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IiM2YjcyODAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5Yb2FpIGNhdDwvdGV4dD48L3N2Zz4="],
            detailImages: [],
            tags: ["xoài", "ngọt", "thịt dày"],
            status: "active",
            sellerId: "seller3",
            sellerName: "Vườn cây ăn trái Hòa Lộc",
            rating: 4.8,
            reviewCount: 32,
            soldCount: 78,
            weight: 800,
            dimensions: { length: 12, width: 8, height: 8 },
            specifications: { "Giống": "Cát Hòa Lộc", "Trọng lượng": "800g/trái" },
            createdAt: "2024-01-13T08:00:00Z",
            updatedAt: "2024-01-13T08:00:00Z"
          }
        ];
        setProducts(mockProducts);
      }
    } catch (error) {
      console.error('Error loading products:', error);
      toast({
        title: "Lỗi",
        description: "Không thể tải danh sách sản phẩm",
        variant: "destructive",
      });
    } finally {
      setIsLoadingProducts(false);
    }
  };

  const loadProductStats = async () => {
    try {
      // Try to load from API first
      try {
        const stats = await productService.getProductStats();
        setProductStats(stats);
      } catch (apiError) {
        console.log('API not available, calculating stats from local data');
        // Fallback to calculating from local products
        const total = products.length;
        const active = products.filter(p => p.status === 'active').length;
        const inactive = products.filter(p => p.status === 'inactive').length;
        const outOfStock = products.filter(p => p.stock === 0).length;
        const pending = products.filter(p => p.status === 'pending').length;
        const lowStock = products.filter(p => p.stock > 0 && p.stock <= 10).length;

        setProductStats({
          total,
          active,
          inactive,
          outOfStock,
          pending,
          lowStock
        });
      }
    } catch (error) {
      console.error('Error loading product stats:', error);
    }
  };

  // Product creation method has been removed

  const handleCreateProduct = async (productData: ProductFormData) => {
    try {
      setIsSubmittingProduct(true);

      // Thử tạo qua API trước
      try {
        console.log('Đang thử tạo sản phẩm qua API...');
        await productService.createProduct(productData);
        console.log('Đã tạo sản phẩm thành công qua API');
        toast({
          title: "Thành công",
          description: "Sản phẩm đã được tạo và lưu vào cơ sở dữ liệu",
        });
        loadProducts(); // Tải lại từ API
      } catch (apiError: any) {
        // Phân biệt lỗi mạng (không gọi được API) và lỗi hợp lệ từ server (400/500)
        const apiErrorMessage = String(apiError?.message || apiError);
        const isNetworkError =
          apiError instanceof TypeError || /Failed to fetch|NetworkError|CORS|ERR_NETWORK/i.test(apiErrorMessage);

        if (!isNetworkError) {
          console.log('API phản hồi với lỗi, không tạo local. Lỗi:', apiErrorMessage);
          toast({
            title: "Tạo sản phẩm thất bại",
            description: apiErrorMessage || "Vui lòng kiểm tra lại dữ liệu (tên, mô tả, danh mục, giá, số lượng)",
            variant: "destructive",
          });
          return;
        }

        console.log('Không thể kết nối API, tạo local (tạm thời). Lỗi:', apiErrorMessage);
        // Fallback to local creation tạm thời nếu không gọi được API
        const newProduct: Product = {
          id: Date.now().toString(),
          name: productData.name,
          description: productData.description,
          shortDescription: productData.shortDescription || "",
          category: productData.category,
          price: productData.price,
          originalPrice: productData.originalPrice || 0,
          stock: productData.stock,
          images: [], // Sẽ được điền khi triển khai upload file
          detailImages: productData.detailImages ? [] : [],
          tags: productData.tags || [],
          status: productData.status,
          sellerId: "current-seller",
          sellerName: "Current Seller",
          rating: 0,
          reviewCount: 0,
          soldCount: 0,
          weight: productData.weight || 0,
          dimensions: productData.dimensions || { length: 0, width: 0, height: 0 },
          specifications: productData.specifications || {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        setProducts(prev => [newProduct, ...prev]);

        toast({ title: "Thành công", description: "Sản phẩm đã được tạo (lưu tạm thời)" });
      }

      setIsAddingProduct(false);
      loadProductStats();
    } catch (error) {
      console.error('Lỗi khi tạo sản phẩm:', error);
      toast({
        title: "Lỗi",
        description: "Không thể tạo sản phẩm",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingProduct(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      active: "default",
      inactive: "secondary",
      pending: "outline",
      completed: "default",
      shipping: "secondary",
      cancelled: "destructive",
      low_stock: "destructive"
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  // Orders actions
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);

  const loadOrders = async () => {
    try {
      setIsLoadingOrders(true);
      const data = await adminOrderService.getAll();
      // Đảm bảo data là array (xử lý cả PageResponse và array trực tiếp)
      const ordersArray = Array.isArray(data) ? data : (data?.content || []);
      setOrdersData(ordersArray);
      // Tính doanh thu nền tảng = 15% giá trị các đơn đã hoàn thành/giao thành công
      const getOrderTotal = (it: any) => Number(it.totalPrice ?? it.totalAmount ?? 0);
      const feeRevenue = (ordersArray || [])
        .filter((o: any) => {
          const s = String(o.status || '').toLowerCase();
          return s === 'delivered' || s === 'completed';
        })
        .reduce((sum: number, o: any) => sum + getOrderTotal(o) * 0.15, 0);
      setPlatformRevenue(feeRevenue);

      // Fetch product names for all order items
      const productIds = new Set<string>();
      const customerIds = new Set<string>();

      ordersArray.forEach(order => {
        // Collect product IDs
        if (order.items && order.items.length > 0) {
          order.items.forEach((item: any) => {
            if (item.productId) {
              productIds.add(item.productId);
            }
          });
        }

        // Collect customer IDs
        if (order.userId) {
          customerIds.add(order.userId);
        }
      });

      // Fetch product names and categories
      const productNamesMap: { [key: string]: string } = {};
      const productCategoriesMap: { [key: string]: string } = {};
      for (const productId of productIds) {
        try {
          const product = await productService.getProductById(productId);
          if (product) {
            productNamesMap[productId] = product.name;
            // Lấy category từ product - thử nhiều trường có thể có
            const category = 
              product.category || 
              product.categoryName || 
              product.productCategory ||
              product.categoryId ||
              (product.categoryObj && (product.categoryObj.name || product.categoryObj.categoryName)) ||
              null;
            
            if (category) {
              productCategoriesMap[productId] = category;
            } else {
              // Debug: log nếu không tìm thấy category
              console.log(`Product ${productId} has no category:`, {
                productId,
                productKeys: Object.keys(product),
                product: product
              });
            }
          }
        } catch (e) {
          console.error(`Failed to fetch product ${productId}:`, e);
        }
      }

      // Fetch customer names
      const customerNamesMap: { [key: string]: string } = {};
      for (const customerId of customerIds) {
        try {
          const customer = await userService.getUserById(customerId);
          if (customer) {
            const fullName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim();
            customerNamesMap[customerId] = fullName || customer.username || 'Khách hàng không tên';
          }
        } catch (e) {
          console.error(`Failed to fetch customer ${customerId}:`, e);
        }
      }

      setProductNames(productNamesMap);
      setProductCategories(productCategoriesMap);
      setCustomerNames(customerNamesMap);
    } catch (e) {
      toast({ title: "Lỗi", description: "Không thể tải đơn hàng", variant: "destructive" });
    } finally {
      setIsLoadingOrders(false);
    }
  };

  const doOrderAction = async (id: string, action: 'confirm' | 'pack' | 'handover' | 'deliver' | 'cancel') => {
    try {
      setLoadingOrderId(id);

      if (action === 'confirm') {
        await adminOrderService.confirm(id);
        toast({
          title: "Thành công",
          description: "Đã duyệt đơn hàng thành công",
        });
      }
      if (action === 'pack') {
        await adminOrderService.pack(id);
        toast({
          title: "Thành công",
          description: "Đã đóng gói đơn hàng",
        });
      }
      if (action === 'handover') {
        await adminOrderService.handover(id);
        toast({
          title: "Thành công",
          description: "Đã bàn giao cho shipper",
        });
      }
      if (action === 'deliver') {
        await adminOrderService.deliver(id);
        toast({
          title: "Thành công",
          description: "Đã xác nhận giao hàng thành công",
        });
      }
      if (action === 'cancel') {
        await adminOrderService.cancel(id);
        toast({
          title: "Thành công",
          description: "Đã hủy đơn hàng",
        });
      }

      // Reload orders to show updated status
      await loadOrders();
    } catch (e: any) {
      toast({ title: "Lỗi", description: String(e?.message || e), variant: "destructive" });
    } finally {
      setLoadingOrderId(null);
    }
  };

  return (
    <AdminGuard>
      <div className="min-h-screen bg-background">
        <Header />

        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Quản trị hệ thống</h1>
            <p className="text-muted-foreground mt-2">Quản lý toàn bộ hoạt động của nền tảng</p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-10">
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="products">Sản phẩm</TabsTrigger>
              <TabsTrigger value="pending-products">Chờ duyệt</TabsTrigger>
              <TabsTrigger value="categories">Danh mục</TabsTrigger>
              <TabsTrigger value="orders-completed">Đơn hàng</TabsTrigger>
              <TabsTrigger value="analytics">Phân tích</TabsTrigger>
              <TabsTrigger value="flashsale">Flash Sale</TabsTrigger>
              <TabsTrigger value="vouchers">Voucher</TabsTrigger>
              <TabsTrigger value="notifications">Thông báo</TabsTrigger>
              <TabsTrigger value="accounts">Tài khoản</TabsTrigger>

            </TabsList>

            <TabsContent value="dashboard" className="space-y-6">
              {/* Statistics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, index) => (
                  <Card
                    key={index}
                    onClick={() => handleStatCardClick(stat.targetTab)}
                    className={`transition ${stat.targetTab ? "cursor-pointer hover:shadow-md" : ""}`}
                  >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        {stat.title}
                      </CardTitle>
                      <stat.icon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                      <div className="flex items-center text-xs text-green-600">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        {stat.trend}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Recent Activity */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Đơn hàng gần đây</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {ordersData.slice(0, 3).map((order) => (
                        <div key={order.id} className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-foreground">#{(order.id || "").slice(-6)}</p>
                            <p className="text-sm text-muted-foreground">
                              {customerNames[order.userId] || order.userId || "Khách hàng"}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-foreground">
                              {formatCurrency(order.totalAmount ?? order.totalPrice ?? 0)}
                            </p>
                            {getStatusBadge(String(order.status || ""))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Sản phẩm bán chạy</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {products.slice(0, 3).map((product) => (
                        <div key={product.id} className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-foreground">{product.name}</p>
                            <p className="text-sm text-muted-foreground capitalize">{product.category}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-foreground">
                              {formatCurrency(product.price)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Kho: {product.stock ?? 0} • Đã bán: {product.soldCount ?? 0}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

            </TabsContent>

            <TabsContent value="orders-completed" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Đơn hàng giao thành công</CardTitle>
                  <CardDescription>
                    Hiển thị {completedOrders.length} đơn hàng ở trạng thái đã giao / hoàn tất
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mã đơn</TableHead>
                        <TableHead>Khách hàng</TableHead>
                        <TableHead>Sản phẩm</TableHead>
                        <TableHead>Tổng tiền</TableHead>
                        <TableHead>Ngày giao</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {completedOrders.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                            Chưa có đơn hàng nào đã giao thành công.
                          </TableCell>
                        </TableRow>
                      ) : (
                        completedOrders.map((order: any) => (
                          <TableRow key={order.id}>
                            <TableCell className="font-semibold">{order.id}</TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{customerNames[order.userId] || order.userId || "Khách hàng"}</p>
                                <p className="text-xs text-muted-foreground">
                                  {order.shippingAddress
                                    ? `${order.shippingAddress.address || ""} ${order.shippingAddress.city || ""}`.trim()
                                    : "Chưa có địa chỉ"}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              {order.items && order.items.length > 0 ? (
                                <div className="space-y-1 text-sm">
                                  {order.items.slice(0, 2).map((item: any, idx: number) => (
                                    <p key={idx}>
                                      {item.productName ||
                                        item.name ||
                                        productNames[item.productId] ||
                                        "Sản phẩm"}{" "}
                                      ×{item.quantity || 1}
                                    </p>
                                  ))}
                                  {order.items.length > 2 && (
                                    <p className="text-xs text-muted-foreground">
                                      +{order.items.length - 2} sản phẩm khác
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <span className="text-sm text-muted-foreground">Không có sản phẩm</span>
                              )}
                            </TableCell>
                            <TableCell className="font-semibold">
                              {formatCurrency(order.totalAmount ?? order.totalPrice ?? 0)}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(
                                order.deliveredAt ||
                                  order.completedAt ||
                                  order.updatedAt ||
                                  order.createdAt ||
                                  Date.now()
                              ).toLocaleString("vi-VN")}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="products" className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Quản lý sản phẩm</h2>
                  <p className="text-muted-foreground">Quản lý tất cả sản phẩm trên nền tảng</p>
                </div>
                <Dialog open={isAddingProduct} onOpenChange={setIsAddingProduct} modal={false}>
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <Plus className="h-4 w-4" />
                      Thêm sản phẩm
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Thêm sản phẩm mới</DialogTitle>
                      <DialogDescription>Nhập thông tin sản phẩm mới</DialogDescription>
                    </DialogHeader>
                    <ProductForm
                      onSubmit={handleCreateProduct}
                      onCancel={() => setIsAddingProduct(false)}
                      isLoading={isSubmittingProduct}
                    />
                  </DialogContent>
                </Dialog>
              </div>

              {/* Product Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Tổng sản phẩm</CardTitle>
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-foreground">{productStats.total}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Đang hoạt động</CardTitle>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-foreground">{productStats.active}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Hết hàng</CardTitle>
                    <X className="h-4 w-4 text-red-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-foreground">{productStats.outOfStock}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Sắp hết hàng</CardTitle>
                    <Clock className="h-4 w-4 text-orange-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-foreground">{productStats.lowStock}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Product Table */}
              <ProductTable
                products={products}
                onRefresh={loadProducts}
                isLoading={isLoadingProducts}
              />
            </TabsContent>

            <TabsContent value="pending-products" className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Chờ duyệt</h2>
                <p className="text-muted-foreground">Xem xét và phê duyệt đăng ký bán hàng và sản phẩm</p>
              </div>

              <Tabs value={pendingTab} onValueChange={setPendingTab} className="space-y-6">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="sellers">Duyệt người đăng ký bán hàng</TabsTrigger>
                  <TabsTrigger value="products">Duyệt sản phẩm</TabsTrigger>
                </TabsList>

                <TabsContent value="sellers" className="space-y-6">
                  {/* Thống kê đăng ký bán hàng - Di chuyển lên đầu */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Chờ duyệt</CardTitle>
                        <Clock className="h-4 w-4 text-orange-500" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-foreground">{sellerStats.pending || pendingSellers.length}</div>
                        <p className="text-xs text-muted-foreground">Đăng ký cần xem xét</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Đã duyệt tuần này</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-foreground">{sellerStats.approvedThisWeek || 0}</div>
                        <p className="text-xs text-muted-foreground">+2 từ tuần trước</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Từ chối tuần này</CardTitle>
                        <X className="h-4 w-4 text-red-500" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-foreground">{sellerStats.rejectedThisWeek || 0}</div>
                        <p className="text-xs text-muted-foreground">Đăng ký không đạt yêu cầu</p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="flex gap-4 items-center">
                    <div className="relative flex-1 max-w-sm">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Tìm kiếm đăng ký bán hàng..." className="pl-9" />
                    </div>
                  </div>

                  <Card>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Tên trang trại</TableHead>
                          <TableHead>Chủ sở hữu</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Danh mục</TableHead>
                          <TableHead>Kinh nghiệm</TableHead>
                          <TableHead>Ngày gửi</TableHead>
                          <TableHead>Trạng thái</TableHead>
                          <TableHead>Thao tác</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loading ? (
                          <TableRow>
                            <TableCell colSpan={9} className="text-center py-8">
                              <div className="flex items-center justify-center">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                                <span className="ml-2">Đang tải...</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : pendingSellers.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                              Không có đăng ký bán hàng nào chờ duyệt
                            </TableCell>
                          </TableRow>
                        ) : (
                          pendingSellers.map((seller) => (
                            <TableRow key={seller.id}>
                              <TableCell>{seller.id}</TableCell>
                              <TableCell className="font-medium">{seller.businessName}</TableCell>
                              <TableCell>{seller.contactPerson}</TableCell>
                              <TableCell>{seller.email}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{seller.farmType}</Badge>
                              </TableCell>
                              <TableCell>{seller.description}</TableCell>
                              <TableCell>{new Date(seller.createdAt).toLocaleDateString('vi-VN')}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-orange-600 border-orange-200">
                                  <Clock className="h-3 w-3 mr-1" />
                                  Chờ duyệt
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button variant="outline" size="sm" title="Xem chi tiết">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-green-600 border-green-200 hover:bg-green-50"
                                    title="Phê duyệt"
                                    onClick={() => handleApproveSeller(seller.id)}
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-red-600 border-red-200 hover:bg-red-50"
                                    title="Từ chối"
                                    onClick={() => handleRejectSeller(seller.id)}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </Card>
                </TabsContent>

                <TabsContent value="products" className="space-y-6">
                  <Tabs value={productApprovalTab} onValueChange={setProductApprovalTab} className="space-y-6">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="manual">Duyệt thủ công</TabsTrigger>
                      <TabsTrigger value="auto">Duyệt tự động</TabsTrigger>
                    </TabsList>

                    <TabsContent value="manual" className="space-y-6">
                      {/* Thống kê sản phẩm chờ duyệt - Di chuyển lên đầu */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Chờ duyệt</CardTitle>
                        <Clock className="h-4 w-4 text-orange-500" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-foreground">{productApprovalStats.pending || pendingProducts.length}</div>
                        <p className="text-xs text-muted-foreground">Sản phẩm cần xem xét</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Đã duyệt tuần này</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-foreground">{productApprovalStats.approvedThisWeek || 0}</div>
                        <p className="text-xs text-muted-foreground">+3 từ tuần trước</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Từ chối tuần này</CardTitle>
                        <X className="h-4 w-4 text-red-500" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-foreground">{productApprovalStats.rejectedThisWeek || 0}</div>
                        <p className="text-xs text-muted-foreground">Sản phẩm không đạt yêu cầu</p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="flex gap-4 items-center">
                    <div className="relative flex-1 max-w-sm">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Tìm kiếm sản phẩm chờ duyệt..." className="pl-9" />
                    </div>
                  </div>

                  <Card>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Tên sản phẩm</TableHead>
                          <TableHead>Danh mục</TableHead>
                          <TableHead>Giá</TableHead>
                          <TableHead>Nông dân</TableHead>
                          <TableHead>Ngày gửi</TableHead>
                          <TableHead>Trạng thái</TableHead>
                          <TableHead>Thao tác</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loading ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-8">
                              <div className="flex items-center justify-center">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                                <span className="ml-2">Đang tải...</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : pendingProducts.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                              Không có sản phẩm nào chờ duyệt
                            </TableCell>
                          </TableRow>
                        ) : (
                          pendingProducts.map((product) => (
                            <TableRow key={product.id}>
                              <TableCell>{product.id}</TableCell>
                              <TableCell className="font-medium">{product.name}</TableCell>
                              <TableCell>{product.category}</TableCell>
                              <TableCell>₫{product.price}</TableCell>
                              <TableCell>{product.sellerId || 'N/A'}</TableCell>
                              <TableCell>{new Date(product.createdAt).toLocaleDateString('vi-VN')}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-orange-600 border-orange-200">
                                  <Clock className="h-3 w-3 mr-1" />
                                  Chờ duyệt
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button variant="outline" size="sm" title="Xem chi tiết">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-green-600 border-green-200 hover:bg-green-50"
                                    title="Phê duyệt"
                                    onClick={() => handleApproveProduct(product.id)}
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-red-600 border-red-200 hover:bg-red-50"
                                    title="Từ chối"
                                    onClick={() => handleRejectProduct(product.id)}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </Card>
                    </TabsContent>

                    <TabsContent value="auto" className="space-y-6">
                      <Card>
                        <CardHeader>
                          <CardTitle>Duyệt tự động</CardTitle>
                          <CardDescription>
                            Cấu hình và quản lý hệ thống duyệt sản phẩm tự động
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="rounded-lg border p-4">
                            <h3 className="font-semibold mb-2">Quy tắc duyệt tự động</h3>
                            <p className="text-sm text-muted-foreground mb-4">
                              Sản phẩm sẽ được duyệt tự động nếu đáp ứng các tiêu chí sau:
                            </p>
                            <ul className="space-y-2 text-sm">
                              <li className="flex items-start gap-2">
                                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                                <span>Giá sản phẩm hợp lệ (lớn hơn 0)</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                                <span>Có mô tả sản phẩm đầy đủ</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                                <span>Danh mục sản phẩm hợp lệ</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                                <span>Người bán đã được xác minh</span>
                              </li>
                            </ul>
                          </div>
                          <div className="rounded-lg border p-4">
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="font-semibold">Bật duyệt tự động</h3>
                              <Button variant="outline" size="sm">
                                Bật
                              </Button>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Khi bật, các sản phẩm đáp ứng quy tắc sẽ được duyệt tự động
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>
                </TabsContent>
              </Tabs>
            </TabsContent>

            <TabsContent value="categories" className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Quản lý danh mục</h2>
                  <p className="text-muted-foreground">Quản lý các danh mục sản phẩm</p>
                </div>
                <Dialog open={isAddingCategory} onOpenChange={setIsAddingCategory}>
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <Plus className="h-4 w-4" />
                      Thêm danh mục
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Thêm danh mục mới</DialogTitle>
                      <DialogDescription>Tạo danh mục sản phẩm mới</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="category-name">Tên danh mục</Label>
                        <Input
                          id="category-name"
                          placeholder="Nhập tên danh mục"
                          value={categoryForm.name}
                          onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="category-description">Mô tả</Label>
                        <Textarea
                          id="category-description"
                          placeholder="Nhập mô tả danh mục"
                          value={categoryForm.description}
                          onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsAddingCategory(false)}>Hủy</Button>
                      <Button onClick={handleAddCategory}>Tạo danh mục</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Tên danh mục</TableHead>
                      <TableHead>Mô tả</TableHead>
                      <TableHead>Số sản phẩm</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead className="text-right">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingCategories ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          Đang tải...
                        </TableCell>
                      </TableRow>
                    ) : categories.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          Chưa có danh mục nào
                        </TableCell>
                      </TableRow>
                    ) : (
                      categories.map((category) => (
                        <TableRow key={category.id}>
                          <TableCell>{category.id}</TableCell>
                          <TableCell className="font-medium">{category.name}</TableCell>
                          <TableCell>{category.description}</TableCell>
                          <TableCell>{category.productCount || 0}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              Active
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => {
                                  setEditingCategory(category);
                                  setIsEditingCategory(true);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => {
                                  setDeletingCategoryId(category.id);
                                  setIsDeletingCategory(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Card>

              {/* Edit Category Dialog */}
              <Dialog open={isEditingCategory} onOpenChange={setIsEditingCategory}>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Chỉnh sửa danh mục</DialogTitle>
                    <DialogDescription>Cập nhật thông tin danh mục</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="edit-category-name">Tên danh mục</Label>
                      <Input
                        id="edit-category-name"
                        value={editingCategory?.name || ''}
                        onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-category-description">Mô tả</Label>
                      <Textarea
                        id="edit-category-description"
                        value={editingCategory?.description || ''}
                        onChange={(e) => setEditingCategory({ ...editingCategory, description: e.target.value })}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsEditingCategory(false)}>Hủy</Button>
                    <Button onClick={handleEditCategory}>Cập nhật</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Delete Category Dialog */}
              <Dialog open={isDeletingCategory} onOpenChange={setIsDeletingCategory}>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Xác nhận xóa danh mục</DialogTitle>
                    <DialogDescription>
                      Bạn có chắc chắn muốn xóa danh mục này? Hành động này không thể hoàn tác.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsDeletingCategory(false)}>Hủy</Button>
                    <Button variant="destructive" onClick={handleDeleteCategory}>Xóa</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Phân tích & Báo cáo</h2>
                <p className="text-muted-foreground">Theo dõi hiệu suất kinh doanh</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Doanh thu hôm nay</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-foreground">{analytics.todayRevenue}</div>
                    <div className="flex items-center text-xs text-green-600">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      {analytics.weeklyGrowth}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Đơn hàng tháng này</CardTitle>
                    <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-foreground">{analytics.monthlyOrders}</div>
                    <div className="flex items-center text-xs text-green-600">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      {analytics.customerGrowth}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Giá trị đơn hàng TB</CardTitle>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-foreground">{analytics.averageOrderValue}</div>
                    <div className="text-xs text-muted-foreground">Danh mục hot: {analytics.topSellingCategory}</div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader className="gap-4">
                    <div>
                      <CardTitle>Biểu đồ doanh thu 7 ngày</CardTitle>
                      <CardDescription>Lọc theo {REVENUE_FILTER_LABELS[revenueFilter]}</CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(["day", "week", "month"] as RevenueFilter[]).map((key) => (
                        <Button
                          key={key}
                          variant={revenueFilter === key ? "default" : "outline"}
                          size="sm"
                          onClick={() => setRevenueFilter(key)}
                        >
                          {key === "day" ? "Ngày" : key === "week" ? "Tuần" : "Tháng"}
                        </Button>
                      ))}
                      <Button variant="outline" size="sm" className="gap-2" onClick={handleExportRevenue}>
                        <Download className="h-4 w-4" />
                        Xuất Excel
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="rounded-lg border p-4">
                        <p className="text-sm text-muted-foreground">Doanh thu</p>
                        <p className="text-2xl font-bold">{formatCurrency(totalRevenueInRange)}</p>
                        <p className="text-xs text-muted-foreground mt-1">{REVENUE_FILTER_LABELS[revenueFilter]}</p>
                      </div>
                      <div className="rounded-lg border p-4">
                        <p className="text-sm text-muted-foreground">Đơn hàng</p>
                        <p className="text-2xl font-bold">{totalOrdersInRange}</p>
                        <p className="text-xs text-muted-foreground mt-1">Đơn đã ghi nhận</p>
                      </div>
                      <div className="rounded-lg border p-4">
                        <p className="text-sm text-muted-foreground">Giá trị TB</p>
                        <p className="text-2xl font-bold">{formatCurrency(averageOrderValueRange)}</p>
                        <p className="text-xs text-muted-foreground mt-1">Chi tiêu trung bình</p>
                      </div>
                    </div>
                    {hasPieData && (
                      <div className="flex flex-col items-center gap-4">
                        <h4 className="text-sm font-semibold text-center">Tỷ lệ đơn hàng theo danh mục (đã bán thành công)</h4>
                        <ChartContainer config={pieChartConfig} className="h-[300px] w-full max-w-[400px]">
                          <RechartsPieChart>
                            <ChartTooltip
                              content={
                                <ChartTooltipContent
                                  formatter={(value, name) => {
                                    if (typeof value === "number") {
                                      const percent = totalPieValue > 0 ? ((value / totalPieValue) * 100).toFixed(1) : "0";
                                      return `${name}: ${percent}% (${value} đơn hàng)`;
                                    }
                                    return `${name}: ${value}`;
                                  }}
                                />
                              }
                            />
                            <Pie
                              data={revenuePieData}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              innerRadius={0}
                              outerRadius={120}
                              paddingAngle={0}
                              stroke="#fff"
                              strokeWidth={2}
                              label={({ cx, cy, midAngle, innerRadius, outerRadius, name, percent }: any) => {
                                const RADIAN = Math.PI / 180;
                                // Đặt text ở trung tâm của slice (50% radius)
                                const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                                const x = cx + radius * Math.cos(-midAngle * RADIAN);
                                const y = cy + radius * Math.sin(-midAngle * RADIAN);
                                const percentValue = (percent * 100).toFixed(0);
                                
                                return (
                                  <text
                                    x={x}
                                    y={y}
                                    fill="white"
                                    textAnchor="middle"
                                    dominantBaseline="central"
                                    fontSize={14}
                                    fontWeight="600"
                                    style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.7)' }}
                                  >
                                    {name} {percentValue}%
                                  </text>
                                );
                              }}
                              labelLine={false}
                              onClick={(data: any) => {
                                if (data && data.name) {
                                  // Toggle: nếu click vào category đang chọn thì bỏ chọn
                                  setSelectedCategory(selectedCategory === data.name ? null : data.name);
                                }
                              }}
                              style={{ cursor: 'pointer' }}
                            >
                              {revenuePieData.map((entry, index) => (
                                <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                              ))}
                            </Pie>
                          </RechartsPieChart>
                        </ChartContainer>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <CardTitle>Top sản phẩm bán chạy</CardTitle>
                        <CardDescription>
                          {selectedCategory 
                            ? `Sản phẩm thuộc danh mục "${selectedCategory}" - ${REVENUE_FILTER_LABELS[revenueFilter]}`
                            : `Sản phẩm đã bán thành công theo ${REVENUE_FILTER_LABELS[revenueFilter]}`
                          }
                        </CardDescription>
                      </div>
                      {selectedCategory && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedCategory(null)}
                        >
                          Xóa bộ lọc
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {topSellingProducts.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        Chưa có sản phẩm nào được bán thành công trong khoảng thời gian này.
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {topSellingProducts.map((product, index) => (
                          <div key={`${product.name}-${index}`} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                                <span className="text-sm font-medium text-primary">{index + 1}</span>
                              </div>
                              <div>
                                <p className="font-medium text-foreground">{product.name}</p>
                                <p className="text-sm text-muted-foreground">{product.category}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-foreground">{formatCurrency(product.price)}</p>
                              <p className="text-xs text-muted-foreground">Đã bán: {product.quantity}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Biểu đồ doanh thu và đơn hàng</CardTitle>
                    <CardDescription>Hiển thị toàn bộ theo {REVENUE_FILTER_LABELS[revenueFilter]}</CardDescription>
                  </CardHeader>
                  <CardContent className="px-2 sm:px-6 pb-6 overflow-hidden">
                    {!hasRevenueTimelineData ? (
                      <p className="text-sm text-muted-foreground text-center py-12 px-6">
                        Chưa có dữ liệu trong khoảng thời gian này.
                      </p>
                    ) : (
                      <div className="w-full">
                        <ChartContainer config={revenueChartConfig} className="h-80 w-full">
                          <RechartsLineChart data={revenueTimelineData} margin={{ left: 12, right: 12, top: 12 }}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} className="text-xs" />
                            <YAxis
                              tickLine={false}
                              axisLine={false}
                              tickMargin={8}
                              width={70}
                              tickFormatter={(value) =>
                                value >= 1_000_000
                                  ? `${(value / 1_000_000).toFixed(1)}tr`
                                  : value >= 1_000
                                  ? `${(value / 1_000).toFixed(0)}k`
                                  : value.toString()
                              }
                            />
                            <ChartTooltip
                              content={
                                <ChartTooltipContent
                                  formatter={(value, name) =>
                                    typeof value === "number"
                                      ? name === "revenue"
                                        ? formatCurrency(value)
                                        : `${value.toLocaleString("vi-VN")} đơn`
                                      : value
                                  }
                                />
                              }
                            />
                            <ChartLegend content={<ChartLegendContent />} />
                            <Line type="monotone" dataKey="revenue" stroke="var(--color-revenue)" strokeWidth={3} dot={false} />
                            <Line
                              type="monotone"
                              dataKey="orders"
                              stroke="var(--color-orders)"
                              strokeDasharray="4 4"
                              strokeWidth={2}
                              dot
                            />
                          </RechartsLineChart>
                        </ChartContainer>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="flashsale" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Zap className="h-5 w-5 text-orange-500" />
                        Quản lý Flash Sale
                      </CardTitle>
                      <CardDescription>
                        Tạo và quản lý các chương trình flash sale cho toàn bộ nền tảng
                      </CardDescription>
                    </div>
                    <Button onClick={() => {
                      setFlashSaleForm({
                        name: "",
                        description: "",
                        banner: "",
                        startTime: "",
                        endTime: "",
                        status: "upcoming",
                        products: []
                      });
                      setEditingFlashSale(null);
                      setShowFlashSaleDialog(true);
                    }}>
                      <Plus className="h-4 w-4 mr-2" />
                      Tạo Flash Sale
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {loadingFlashSales ? (
                    <div className="text-center py-8">
                      <Clock className="h-8 w-8 animate-spin mx-auto mb-2" />
                      <p className="text-muted-foreground">Đang tải...</p>
                    </div>
                  ) : flashSales.length === 0 ? (
                    <div className="text-center py-8">
                      <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground mb-4">Chưa có flash sale nào</p>
                      <Button onClick={() => {
                        setFlashSaleForm({
                          name: "",
                          description: "",
                          banner: "",
                          startTime: "",
                          endTime: "",
                          status: "upcoming",
                          products: []
                        });
                        setEditingFlashSale(null);
                        setShowFlashSaleDialog(true);
                      }}>
                        <Plus className="h-4 w-4 mr-2" />
                        Tạo Flash Sale đầu tiên
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {flashSales.map((flashSale) => {
                        // Parse UTC time from backend and convert to local time for display
                        // Backend returns "2025-12-03T06:21:00" (UTC, no timezone indicator)
                        // Need to parse as UTC and convert to local
                        const parseUTCDateTime = (dateString: string): Date => {
                          // Format: "2025-12-03T06:21:00" or "2025-12-03T06:21:00.000"
                          const [datePart, timePart] = dateString.split('T');
                          if (!datePart || !timePart) {
                            return new Date(dateString);
                          }
                          const [year, month, day] = datePart.split('-').map(Number);
                          const timeOnly = timePart.split('.')[0];
                          const [hours, minutes, seconds] = timeOnly.split(':').map(Number);
                          // Parse as UTC
                          return new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds || 0));
                        };
                        
                        const startTime = parseUTCDateTime(flashSale.startTime);
                        const endTime = parseUTCDateTime(flashSale.endTime);
                        const now = new Date();
                        const isActive = now >= startTime && now <= endTime && flashSale.status === 'active';
                        const isUpcoming = now < startTime && flashSale.status === 'upcoming';
                        const isEnded = now > endTime || flashSale.status === 'ended';

                        return (
                          <Card key={flashSale.id} className="border-2">
                            <CardHeader>
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <CardTitle>{flashSale.name}</CardTitle>
                                    <Badge variant={
                                      isActive ? "default" : 
                                      isUpcoming ? "secondary" : 
                                      "outline"
                                    }>
                                      {isActive ? 'Đang diễn ra' : isUpcoming ? 'Sắp diễn ra' : 'Đã kết thúc'}
                                    </Badge>
                                  </div>
                                  <CardDescription>{flashSale.description}</CardDescription>
                                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                      <Calendar className="h-4 w-4" />
                                      <span>
                                        {startTime.toLocaleString('vi-VN')} - {endTime.toLocaleString('vi-VN')}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Package className="h-4 w-4" />
                                      <span>{flashSale.products?.length || 0} sản phẩm</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setEditingFlashSale(flashSale);
                                      // Convert UTC datetime from backend to local datetime string for input
                                      // Backend returns ISO string (UTC), we need to convert to local time
                                      const formatLocalDateTime = (dateString: string) => {
                                        // Backend trả về LocalDateTime (không có timezone info)
                                        // Format: "2025-12-02T11:00:00" hoặc "2025-12-02T11:00:00.000"
                                        // LocalDateTime trong Java thường là local time của server
                                        // Khi serialize sang JSON, nó không có timezone
                                        // Khi JavaScript parse "YYYY-MM-DDTHH:mm:ss" không có timezone, nó hiểu như UTC
                                        // Nhưng thực tế nó là local time của server (có thể UTC+7)
                                        
                                        // Backend trả về LocalDateTime string không có timezone
                                        // Format: "2025-12-02T11:00:00" hoặc "2025-12-02T11:00:00.000"
                                        // Vấn đề: Khi dùng new Date("2025-12-02T11:00:00"), JS parse như UTC
                                        // Nhưng nếu backend lưu local time (UTC+7), thì "11:00" thực tế là "04:00 UTC"
                                        // Khi parse như UTC và lấy local components, sẽ bị lệch
                                        
                                        // Giải pháp: Parse như UTC (vì backend có thể lưu UTC)
                                        // Nhưng cần điều chỉnh theo timezone offset
                                        
                                        const [datePart, timePart] = dateString.split('T');
                                        if (!datePart || !timePart) {
                                          const date = new Date(dateString);
                                          const y = date.getFullYear();
                                          const m = String(date.getMonth() + 1).padStart(2, '0');
                                          const d = String(date.getDate()).padStart(2, '0');
                                          const h = String(date.getHours()).padStart(2, '0');
                                          const min = String(date.getMinutes()).padStart(2, '0');
                                          return `${y}-${m}-${d}T${h}:${min}`;
                                        }
                                        
                                        // Vấn đề timezone:
                                        // - User nhập 11:44 local time
                                        // - Gửi lên backend như UTC (04:44 UTC nếu ở UTC+7)
                                        // - Backend lưu 04:44 (LocalDateTime, không có timezone)
                                        // - Backend trả về "2025-12-02T04:44:00" (không có timezone)
                                        // - JS parse như UTC → hiển thị 04:44 local (sai)
                                        
                                        // Giải pháp: Parse như UTC (vì backend lưu UTC), rồi lấy local components
                                        const [year, month, day] = datePart.split('-').map(Number);
                                        const timeOnly = timePart.split('.')[0];
                                        const [hours, minutes] = timeOnly.split(':').map(Number);
                                        
                                        // Backend trả về LocalDateTime string không có timezone
                                        // Format: "2025-12-02T04:44:00" 
                                        // Vấn đề: Khi parse "2025-12-02T04:44:00" bằng new Date(), JS hiểu như UTC
                                        // Nếu backend lưu UTC, thì "04:44 UTC" = "11:44 UTC+7" (local)
                                        // Nhưng user thấy "04:44" → có nghĩa là parse sai hoặc backend lưu sai
                                        
                                        // Vấn đề: Backend trả về LocalDateTime string không có timezone
                                        // Format: "2025-12-02T04:44:00"
                                        // Khi parse "2025-12-02T04:44:00" bằng new Date(), JS hiểu như UTC
                                        // Nếu backend lưu UTC, thì "04:44 UTC" = "11:44 UTC+7" (local)
                                        // Nhưng user thấy "04:44" → có nghĩa là backend đang lưu local time (UTC+7) như UTC
                                        
                                        // Giải pháp: Giả sử backend trả về UTC time (nhưng không có Z)
                                        // Parse như UTC và lấy local components
                                        const utcDate = new Date(Date.UTC(year, month - 1, day, hours, minutes));
                                        
                                        // Lấy local time components (convert từ UTC sang local)
                                        const localYear = utcDate.getFullYear();
                                        const localMonth = String(utcDate.getMonth() + 1).padStart(2, '0');
                                        const localDay = String(utcDate.getDate()).padStart(2, '0');
                                        const localHours = String(utcDate.getHours()).padStart(2, '0');
                                        const localMinutes = String(utcDate.getMinutes()).padStart(2, '0');
                                        
                                        return `${localYear}-${localMonth}-${localDay}T${localHours}:${localMinutes}`;
                                      };
                                      
                                      setFlashSaleForm({
                                        name: flashSale.name,
                                        description: flashSale.description,
                                        banner: flashSale.banner,
                                        startTime: formatLocalDateTime(flashSale.startTime),
                                        endTime: formatLocalDateTime(flashSale.endTime),
                                        status: flashSale.status as any,
                                        products: flashSale.products || []
                                      });
                                      setShowFlashSaleDialog(true);
                                    }}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={async () => {
                                      if (confirm('Bạn có chắc muốn xóa flash sale này?')) {
                                        try {
                                          await flashSaleService.getAllFlashSales();
                                          const response = await fetch(`${(import.meta as any).env?.VITE_API_BASE_URL || ''}/api/flashsales/${flashSale.id}`, {
                                            method: 'DELETE',
                                            headers: {
                                              'Authorization': `Bearer ${localStorage.getItem('token')}`,
                                            },
                                          });
                                          if (response.ok) {
                                            toast({
                                              title: 'Thành công',
                                              description: 'Đã xóa flash sale',
                                            });
                                            loadFlashSales();
                                          } else {
                                            throw new Error('Không thể xóa');
                                          }
                                        } catch (error) {
                                          toast({
                                            title: 'Lỗi',
                                            description: 'Không thể xóa flash sale',
                                            variant: 'destructive',
                                          });
                                        }
                                      }
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent>
                              {flashSale.products && flashSale.products.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                  {flashSale.products.map((product) => (
                                    <Card key={product.productId} className="border">
                                      <CardContent className="p-4">
                                        <div className="flex items-start gap-3">
                                          <img
                                            src={product.productImage || '/placeholder.svg'}
                                            alt={product.productName}
                                            className="w-16 h-16 object-cover rounded"
                                            onError={(e) => {
                                              (e.target as HTMLImageElement).src = '/placeholder.svg';
                                            }}
                                          />
                                          <div className="flex-1 min-w-0">
                                            <h4 className="font-medium text-sm line-clamp-2 mb-1">
                                              {product.productName}
                                            </h4>
                                            <div className="flex items-center gap-2 mb-1">
                                              <span className="text-red-500 font-bold text-sm">
                                                ₫{product.flashSalePrice.toLocaleString()}
                                              </span>
                                              <span className="text-xs text-muted-foreground line-through">
                                                ₫{product.originalPrice.toLocaleString()}
                                              </span>
                                              <Badge variant="destructive" className="text-xs">
                                                -{Math.round(product.discountPercentage || 0)}%
                                              </Badge>
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                              Kho: {product.flashSaleStock} | Đã bán: {product.soldCount} | Max/người: {product.maxQuantityPerUser}
                                            </div>
                                          </div>
                                        </div>
                                      </CardContent>
                                    </Card>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-muted-foreground text-center py-4">Chưa có sản phẩm</p>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="vouchers" className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Quản lý Voucher</h2>
                  <p className="text-muted-foreground">Quản lý voucher platform và shop</p>
                </div>
                <Dialog open={showVoucherForm} onOpenChange={setShowVoucherForm}>
                  <DialogTrigger asChild>
                    <Button onClick={() => setEditingVoucher(undefined)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Tạo voucher
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{editingVoucher ? "Sửa voucher" : "Tạo voucher mới"}</DialogTitle>
                      <DialogDescription>
                        {editingVoucher ? "Cập nhật thông tin voucher" : "Tạo voucher platform-wide mới"}
                      </DialogDescription>
                    </DialogHeader>
                    <VoucherForm
                      voucher={editingVoucher}
                      onSubmit={async (data) => {
                        try {
                          if (editingVoucher) {
                            await voucherService.updateVoucher(editingVoucher.id, data);
                            toast({ title: "Thành công", description: "Đã cập nhật voucher" });
                          } else {
                            await voucherService.createVoucher(data);
                            toast({ title: "Thành công", description: "Đã tạo voucher" });
                          }
                          setShowVoucherForm(false);
                          setEditingVoucher(undefined);
                          loadVouchers();
                          loadVoucherStatistics();
                        } catch (error: any) {
                          toast({
                            title: "Lỗi",
                            description: error.message || "Không thể lưu voucher",
                            variant: "destructive",
                          });
                        }
                      }}
                      onCancel={() => {
                        setShowVoucherForm(false);
                        setEditingVoucher(undefined);
                      }}
                    />
                  </DialogContent>
                </Dialog>
              </div>

              {/* Statistics */}
              {voucherStatistics && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Tổng voucher</CardTitle>
                      <Ticket className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{voucherStatistics.totalVouchers || 0}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Đang hoạt động</CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{voucherStatistics.activeVouchers || 0}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Tổng lượt dùng</CardTitle>
                      <Gift className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{voucherStatistics.totalUsages || 0}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Tổng giảm giá</CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {(voucherStatistics.totalDiscountGiven || 0).toLocaleString()}đ
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Filters */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Tìm kiếm voucher..."
                    value={voucherSearchTerm}
                    onChange={(e) => setVoucherSearchTerm(e.target.value)}
                    className="max-w-sm"
                  />
                </div>
                <Select value={voucherStatusFilter} onValueChange={setVoucherStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Lọc theo trạng thái" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Tất cả</SelectItem>
                    <SelectItem value="active">Hoạt động</SelectItem>
                    <SelectItem value="inactive">Không hoạt động</SelectItem>
                    <SelectItem value="expired">Hết hạn</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Vouchers Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Danh sách voucher</CardTitle>
                  <CardDescription>Tất cả voucher platform và shop</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingVouchers ? (
                    <div className="text-center py-8">Đang tải...</div>
                  ) : vouchers.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">Chưa có voucher nào</div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Mã</TableHead>
                          <TableHead>Tên</TableHead>
                          <TableHead>Loại</TableHead>
                          <TableHead>Giá trị</TableHead>
                          <TableHead>Đã dùng</TableHead>
                          <TableHead>HSD</TableHead>
                          <TableHead>Trạng thái</TableHead>
                          <TableHead>Loại</TableHead>
                          <TableHead>Thao tác</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {vouchers
                          .filter((v) => {
                            const matchesSearch =
                              !voucherSearchTerm ||
                              v.code.toLowerCase().includes(voucherSearchTerm.toLowerCase()) ||
                              v.name.toLowerCase().includes(voucherSearchTerm.toLowerCase());
                            const matchesStatus =
                              voucherStatusFilter === "ALL" || v.status === voucherStatusFilter;
                            return matchesSearch && matchesStatus;
                          })
                          .map((voucher) => (
                            <TableRow key={voucher.id}>
                              <TableCell className="font-mono">{voucher.code}</TableCell>
                              <TableCell>{voucher.name}</TableCell>
                              <TableCell>
                                {voucher.type === "percentage"
                                  ? "Giảm %"
                                  : voucher.type === "fixed_amount"
                                  ? "Giảm tiền"
                                  : "Miễn phí ship"}
                              </TableCell>
                              <TableCell>
                                {voucher.type === "percentage"
                                  ? `${voucher.value}%`
                                  : voucher.type === "fixed_amount"
                                  ? `${voucher.value.toLocaleString()}đ`
                                  : "Miễn phí ship"}
                              </TableCell>
                              <TableCell>
                                {voucher.usageLimit === -1
                                  ? `${voucher.usedCount}`
                                  : `${voucher.usedCount}/${voucher.usageLimit}`}
                              </TableCell>
                              <TableCell>{format(new Date(voucher.endDate), "dd/MM/yyyy")}</TableCell>
                              <TableCell>
                                {voucher.status === "active" ? (
                                  <Badge variant="default">Hoạt động</Badge>
                                ) : voucher.status === "inactive" ? (
                                  <Badge variant="secondary">Không hoạt động</Badge>
                                ) : (
                                  <Badge variant="outline">Hết hạn</Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                {voucher.shopId ? (
                                  <Badge variant="outline">Shop</Badge>
                                ) : (
                                  <Badge>Platform</Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setEditingVoucher(voucher);
                                      setShowVoucherForm(true);
                                    }}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={async () => {
                                      const newStatus = voucher.status === "active" ? "inactive" : "active";
                                      try {
                                        await voucherService.updateVoucherStatus(voucher.id, newStatus);
                                        toast({
                                          title: "Thành công",
                                          description: `Đã ${newStatus === "active" ? "kích hoạt" : "vô hiệu hóa"} voucher`,
                                        });
                                        loadVouchers();
                                        loadVoucherStatistics();
                                      } catch (error: any) {
                                        toast({
                                          title: "Lỗi",
                                          description: error.message || "Không thể cập nhật trạng thái",
                                          variant: "destructive",
                                        });
                                      }
                                    }}
                                  >
                                    {voucher.status === "active" ? "Vô hiệu" : "Kích hoạt"}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={async () => {
                                      if (!confirm("Bạn có chắc muốn xóa voucher này?")) return;
                                      try {
                                        await voucherService.deleteVoucher(voucher.id);
                                        toast({ title: "Thành công", description: "Đã xóa voucher" });
                                        loadVouchers();
                                        loadVoucherStatistics();
                                      } catch (error: any) {
                                        toast({
                                          title: "Lỗi",
                                          description: error.message || "Không thể xóa voucher",
                                          variant: "destructive",
                                        });
                                      }
                                    }}
                                    className="text-destructive"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notifications" className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Thông báo hệ thống</h2>
                  <p className="text-muted-foreground">Quản lý thông báo và cảnh báo</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={handleMarkAllNotifications}
                  >
                    <CheckCircle className="h-4 w-4" />
                    Đánh dấu đã đọc tất cả
                  </Button>
                  <Button
                    onClick={() => setShowSendNotificationDialog(true)}
                    className="gap-2"
                  >
                    <Bell className="h-4 w-4" />
                    Gửi thông báo
                  </Button>
                </div>
              </div>

              <div className="grid gap-4">
                {notifications.map((notification) => (
                  <Alert key={notification.id} className={notification.isRead ? "opacity-60" : ""}>
                    <div className="flex items-start gap-3">
                      {notification.type === "warning" ? (
                        <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5" />
                      ) : notification.type === "error" ? (
                        <X className="h-4 w-4 text-red-500 mt-0.5" />
                      ) : (
                        <Bell className="h-4 w-4 text-blue-500 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium text-foreground">{notification.title}</h3>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">{notification.created}</span>
                            {!notification.isRead && (
                              <div className="w-2 h-2 bg-primary rounded-full"></div>
                            )}
                          </div>
                        </div>
                        <AlertDescription className="mt-1">
                          {notification.message}
                        </AlertDescription>
                        <div className="flex gap-2 mt-3">
                          <Button variant="outline" size="sm">Xem chi tiết</Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleMarkNotificationAsRead(notification.id)}
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Đánh dấu đã đọc
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => handleDeleteNotification(notification.id)}
                            disabled={deletingNotificationId === notification.id}
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            {deletingNotificationId === notification.id ? "Đang xóa..." : "Xóa"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Alert>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="accounts" className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Quản lý tài khoản</h2>
                  <p className="text-muted-foreground">Danh sách tất cả người dùng trong hệ thống (bao gồm USER, SELLER, ADMIN)</p>
                </div>
                <Button onClick={() => fetchAllUsers()} variant="outline">Tải lại</Button>
              </div>

              {/* Search and Filter */}
              <div className="flex gap-4 items-center">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Tìm kiếm theo tên, username, email..."
                    className="pl-9"
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                  />
                </div>
                <Select value={userRoleFilter} onValueChange={setUserRoleFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Lọc theo vai trò" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Tất cả vai trò</SelectItem>
                    <SelectItem value="USER">USER</SelectItem>
                    <SelectItem value="SELLER">SELLER</SelectItem>
                    <SelectItem value="ADMIN">ADMIN</SelectItem>
                  </SelectContent>
                </Select>
                <div className="text-sm text-muted-foreground">
                  Tổng: {allUsers.length} người dùng
                  {userRoleFilter !== "ALL" && ` (${allUsers.filter((u: any) => u.role === userRoleFilter).length} ${userRoleFilter})`}
                </div>
              </div>

              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tên khách hàng</TableHead>
                      <TableHead>Username</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Vai trò</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead>Họ</TableHead>
                      <TableHead>Tên</TableHead>
                      <TableHead>Điện thoại</TableHead>
                      <TableHead>Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingUsers ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8">Đang tải...</TableCell>
                      </TableRow>
                    ) : (() => {
                      // Filter users based on search and role
                      let filteredUsers = allUsers;

                      // Filter by role
                      if (userRoleFilter !== "ALL") {
                        filteredUsers = filteredUsers.filter((u: any) => u.role === userRoleFilter);
                      }

                      // Filter by search term
                      if (userSearchTerm.trim()) {
                        const search = userSearchTerm.toLowerCase();
                        filteredUsers = filteredUsers.filter((u: any) =>
                          (u.username || "").toLowerCase().includes(search) ||
                          (u.email || "").toLowerCase().includes(search) ||
                          (u.firstName || "").toLowerCase().includes(search) ||
                          (u.lastName || "").toLowerCase().includes(search) ||
                          `${u.firstName || ""} ${u.lastName || ""}`.toLowerCase().includes(search)
                        );
                      }

                      if (filteredUsers.length === 0) {
                        return (
                          <TableRow>
                            <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                              {allUsers.length === 0
                                ? "Không có người dùng"
                                : `Không tìm thấy người dùng nào với bộ lọc đã chọn`}
                            </TableCell>
                          </TableRow>
                        );
                      }

                      return filteredUsers.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell className="font-medium">
                            {`${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username || 'Khách hàng không tên'}
                          </TableCell>
                          <TableCell className="font-medium">{u.username}</TableCell>
                          <TableCell>{u.email}</TableCell>
                          <TableCell><Badge variant="outline">{u.role}</Badge></TableCell>
                          <TableCell>
                            <Badge variant={getAccountStatusBadgeVariant(u.accountStatus)}>
                              {getAccountStatusLabel(u.accountStatus)}
                            </Badge>
                          </TableCell>
                          <TableCell>{u.firstName || ""}</TableCell>
                          <TableCell>{u.lastName || ""}</TableCell>
                          <TableCell>{u.phoneNumber || ""}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" onClick={() => openViewUser(u)}>Chi tiết</Button>
                              <Button variant="outline" size="sm" onClick={() => openEditUser(u)}>Sửa</Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 border-red-200 hover:bg-red-50"
                                onClick={() => openDeleteUser(u.id)}
                              >
                                Xóa
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ));
                    })()}
                  </TableBody>
                </Table>
              </Card>

              {/* Edit User Dialog */}
              <Dialog open={isEditingUser} onOpenChange={setIsEditingUser}>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Sửa tài khoản</DialogTitle>
                    <DialogDescription>Cập nhật thông tin người dùng</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-3 py-2">
                    <div className="grid gap-2">
                      <Label>Tên đăng nhập</Label>
                      <Input value={editingUser?.username || ""} onChange={(e) => setEditingUser((prev: any) => ({ ...prev, username: e.target.value }))} />
                    </div>
                    <div className="grid gap-2">
                      <Label>Email</Label>
                      <Input type="email" value={editingUser?.email || ""} onChange={(e) => setEditingUser((prev: any) => ({ ...prev, email: e.target.value }))} />
                    </div>
                    <div className="grid gap-2">
                      <Label>Vai trò</Label>
                      <select
                        value={editingUser?.role || "USER"}
                        onChange={(e) => setEditingUser((prev: any) => ({ ...prev, role: e.target.value }))}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      >
                        <option value="USER">USER</option>
                        <option value="ADMIN">ADMIN</option>
                        <option value="SELLER">SELLER</option>
                      </select>
                    </div>
                    <div className="grid gap-2">
                      <Label>Trạng thái</Label>
                      <Select
                        value={editingUser?.accountStatus || "ACTIVE"}
                        onValueChange={(value: "ACTIVE" | "VIOLATION" | "RESTRICTED" | "SUSPENDED") =>
                          setEditingUser((prev: any) => ({ ...prev, accountStatus: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn trạng thái" />
                        </SelectTrigger>
                        <SelectContent>
                          {accountStatusOptions.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2 grid-cols-2">
                      <div>
                        <Label>Họ</Label>
                        <Input value={editingUser?.firstName || ""} onChange={(e) => setEditingUser((prev: any) => ({ ...prev, firstName: e.target.value }))} />
                      </div>
                      <div>
                        <Label>Tên</Label>
                        <Input value={editingUser?.lastName || ""} onChange={(e) => setEditingUser((prev: any) => ({ ...prev, lastName: e.target.value }))} />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label>Điện thoại</Label>
                      <Input value={editingUser?.phoneNumber || ""} onChange={(e) => setEditingUser((prev: any) => ({ ...prev, phoneNumber: e.target.value }))} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsEditingUser(false)}>Hủy</Button>
                    <Button onClick={submitEditUser}>Lưu</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* View User Details Dialog */}
              <Dialog
                open={isViewingUser}
                onOpenChange={(open) => {
                  setIsViewingUser(open);
                  if (!open) setViewingUser(null);
                }}
              >
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Chi tiết tài khoản</DialogTitle>
                    <DialogDescription>Thông tin đầy đủ của người dùng</DialogDescription>
                  </DialogHeader>
                  {viewingUser ? (
                    <div className="grid gap-3 py-2">
                      <div className="grid gap-1">
                        <Label className="text-sm text-muted-foreground">Tên khách hàng</Label>
                        <span className="font-medium text-foreground">
                          {`${viewingUser.firstName || ''} ${viewingUser.lastName || ''}`.trim() || viewingUser.username || 'Không có tên'}
                        </span>
                      </div>
                      <div className="grid gap-1">
                        <Label className="text-sm text-muted-foreground">Username</Label>
                        <span>{viewingUser.username || '—'}</span>
                      </div>
                      <div className="grid gap-1">
                        <Label className="text-sm text-muted-foreground">Email</Label>
                        <span>{viewingUser.email || '—'}</span>
                      </div>
                      <div className="grid gap-1">
                        <Label className="text-sm text-muted-foreground">Vai trò</Label>
                        <Badge variant="outline">{viewingUser.role || 'USER'}</Badge>
                      </div>
                      <div className="grid gap-1">
                        <Label className="text-sm text-muted-foreground">Trạng thái</Label>
                        <Badge variant={getAccountStatusBadgeVariant(viewingUser.accountStatus)}>
                          {getAccountStatusLabel(viewingUser.accountStatus)}
                        </Badge>
                      </div>
                      <div className="grid gap-1">
                        <Label className="text-sm text-muted-foreground">Số điện thoại</Label>
                        <span>{viewingUser.phoneNumber || '—'}</span>
                      </div>
                      <div className="grid gap-1">
                        <Label className="text-sm text-muted-foreground">Ngày tham gia</Label>
                        <span>
                          {viewingUser.createdAt
                            ? new Date(viewingUser.createdAt).toLocaleString('vi-VN')
                            : '—'}
                        </span>
                      </div>
                      <div className="grid gap-1">
                        <Label className="text-sm text-muted-foreground">Địa chỉ</Label>
                        <span>
                          {[
                            viewingUser.addressStreet,
                            viewingUser.addressWard,
                            viewingUser.addressDistrict,
                            viewingUser.addressCity,
                          ]
                            .filter(Boolean)
                            .join(", ") || '—'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Không có dữ liệu người dùng</p>
                  )}
                  <DialogFooter>
                    <Button onClick={() => setIsViewingUser(false)}>Đóng</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Delete Confirm Dialog */}
              <Dialog open={isDeletingUser} onOpenChange={setIsDeletingUser}>
                <DialogContent className="max-w-sm">
                  <DialogHeader>
                    <DialogTitle>Xóa tài khoản</DialogTitle>
                    <DialogDescription>Hành động này không thể hoàn tác. Bạn chắc chắn muốn xóa?</DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsDeletingUser(false)}>Hủy</Button>
                    <Button className="bg-red-600 hover:bg-red-700" onClick={confirmDeleteUser}>Xóa</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </TabsContent>

            {/* Send Notification Dialog */}
            <Dialog open={showSendNotificationDialog} onOpenChange={setShowSendNotificationDialog}>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Gửi thông báo</DialogTitle>
                  <DialogDescription>
                    Tạo và gửi thông báo tới nhóm người dùng mong muốn
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="notification-title">Tiêu đề thông báo</Label>
                    <Input
                      id="notification-title"
                      placeholder="Nhập tiêu đề thông báo..."
                      value={notificationForm.title}
                      onChange={(e) => setNotificationForm(prev => ({ ...prev, title: e.target.value }))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="notification-type">Loại thông báo</Label>
                    <Select
                      value={notificationForm.type}
                      onValueChange={(value: 'INFO' | 'ORDER' | 'PROMO' | 'SYSTEM') =>
                        setNotificationForm(prev => ({ ...prev, type: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INFO">Thông tin</SelectItem>
                        <SelectItem value="ORDER">Đơn hàng</SelectItem>
                        <SelectItem value="PROMO">Khuyến mãi</SelectItem>
                        <SelectItem value="SYSTEM">Hệ thống</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="notification-target">Đối tượng nhận</Label>
                    <Select
                      value={notificationForm.target}
                      onValueChange={(value: 'ALL' | 'CUSTOMERS' | 'SELLERS') =>
                        setNotificationForm(prev => ({ ...prev, target: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn đối tượng" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">Tất cả người dùng</SelectItem>
                        <SelectItem value="CUSTOMERS">Chỉ khách hàng</SelectItem>
                        <SelectItem value="SELLERS">Chỉ người bán hàng</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="notification-message">Nội dung thông báo</Label>
                    <Textarea
                      id="notification-message"
                      placeholder="Nhập nội dung thông báo..."
                      value={notificationForm.message}
                      onChange={(e) => setNotificationForm(prev => ({ ...prev, message: e.target.value }))}
                      rows={4}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setShowSendNotificationDialog(false)}
                  >
                    Hủy
                  </Button>
                  <Button
                    onClick={sendNotificationToAllUsers}
                    disabled={isSendingNotification || !notificationForm.title.trim() || !notificationForm.message.trim()}
                    className="gap-2"
                  >
                    {isSendingNotification ? (
                      <>
                        <Clock className="h-4 w-4 animate-spin" />
                        Đang gửi...
                      </>
                    ) : (
                      <>
                        <Bell className="h-4 w-4" />
                        Gửi thông báo
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Create/Edit Flash Sale Dialog */}
            <Dialog open={showFlashSaleDialog} onOpenChange={setShowFlashSaleDialog}>
              <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingFlashSale ? 'Cập nhật Flash Sale' : 'Tạo Flash Sale mới'}
                  </DialogTitle>
                  <DialogDescription>
                    Tạo chương trình flash sale để giảm giá sản phẩm trong thời gian giới hạn
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="fs-name">Tên Flash Sale *</Label>
                    <Input
                      id="fs-name"
                      value={flashSaleForm.name}
                      onChange={(e) => setFlashSaleForm(p => ({ ...p, name: e.target.value }))}
                      placeholder="Ví dụ: Flash Sale 12h - Rau củ quả hữu cơ"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="fs-desc">Mô tả *</Label>
                    <Textarea
                      id="fs-desc"
                      value={flashSaleForm.description}
                      onChange={(e) => setFlashSaleForm(p => ({ ...p, description: e.target.value }))}
                      placeholder="Mô tả về chương trình flash sale"
                      rows={3}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="fs-banner">URL Banner (tùy chọn)</Label>
                    <Input
                      id="fs-banner"
                      value={flashSaleForm.banner}
                      onChange={(e) => setFlashSaleForm(p => ({ ...p, banner: e.target.value }))}
                      placeholder="https://example.com/banner.jpg"
                    />
                  </div>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="fs-start">Thời gian bắt đầu *</Label>
                      <Input
                        id="fs-start"
                        type="datetime-local"
                        value={flashSaleForm.startTime}
                        onChange={(e) => setFlashSaleForm(p => ({ ...p, startTime: e.target.value }))}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="fs-end">Thời gian kết thúc *</Label>
                      <Input
                        id="fs-end"
                        type="datetime-local"
                        value={flashSaleForm.endTime}
                        onChange={(e) => setFlashSaleForm(p => ({ ...p, endTime: e.target.value }))}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="fs-status">Trạng thái *</Label>
                      <Select
                        value={flashSaleForm.status}
                        onValueChange={(value: "upcoming" | "active" | "ended" | "cancelled") =>
                          setFlashSaleForm(p => ({ ...p, status: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="upcoming">Sắp diễn ra</SelectItem>
                          <SelectItem value="active">Đang diễn ra</SelectItem>
                          <SelectItem value="ended">Đã kết thúc</SelectItem>
                          <SelectItem value="cancelled">Đã hủy</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Alert>
                    <AlertDescription>
                      <strong>Lưu ý:</strong> Bạn có thể tạo flash sale mà không cần thêm sản phẩm ngay. 
                      Các seller sẽ tự thêm sản phẩm của họ vào flash sale này sau khi bạn tạo.
                    </AlertDescription>
                  </Alert>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => {
                    setShowFlashSaleDialog(false);
                    setEditingFlashSale(null);
                  }}>
                    Hủy
                  </Button>
                  <Button
                    onClick={async () => {
                      if (!flashSaleForm.name || !flashSaleForm.description || 
                          !flashSaleForm.startTime || !flashSaleForm.endTime) {
                        toast({
                          title: 'Lỗi',
                          description: 'Vui lòng điền đầy đủ thông tin',
                          variant: 'destructive',
                        });
                        return;
                      }

                      try {
                        const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || '';
                        
                        // Convert local datetime string to ISO string
                        // Input format: YYYY-MM-DDTHH:mm (local time, no timezone info)
                        // When creating Date from this string, it's treated as local time
                        // We need to send UTC to backend
                        
                        // Parse as local time (not UTC)
                        const parseLocalDateTime = (dateTimeString: string): Date => {
                          // dateTimeString is in format "YYYY-MM-DDTHH:mm" (local time)
                          const [datePart, timePart] = dateTimeString.split('T');
                          const [year, month, day] = datePart.split('-').map(Number);
                          const [hours, minutes] = timePart.split(':').map(Number);
                          
                          // Create date in local timezone
                          return new Date(year, month - 1, day, hours, minutes);
                        };
                        
                        const startDate = parseLocalDateTime(flashSaleForm.startTime);
                        const endDate = parseLocalDateTime(flashSaleForm.endTime);
                        
                        // Validate dates
                        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                          toast({
                            title: 'Lỗi',
                            description: 'Thời gian không hợp lệ',
                            variant: 'destructive',
                          });
                          return;
                        }
                        
                        if (endDate <= startDate) {
                          toast({
                            title: 'Lỗi',
                            description: 'Thời gian kết thúc phải sau thời gian bắt đầu',
                            variant: 'destructive',
                          });
                          return;
                        }
                        
                        // Convert to format yyyy-MM-dd'T'HH:mm:ss (UTC) for backend
                        // Backend expects format: yyyy-MM-dd'T'HH:mm:ss (no milliseconds, no Z)
                        const formatForBackend = (date: Date): string => {
                          const year = date.getUTCFullYear();
                          const month = String(date.getUTCMonth() + 1).padStart(2, '0');
                          const day = String(date.getUTCDate()).padStart(2, '0');
                          const hours = String(date.getUTCHours()).padStart(2, '0');
                          const minutes = String(date.getUTCMinutes()).padStart(2, '0');
                          const seconds = String(date.getUTCSeconds()).padStart(2, '0');
                          return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
                        };
                        
                        const flashSaleData: any = {
                          name: flashSaleForm.name,
                          description: flashSaleForm.description,
                          banner: flashSaleForm.banner || '',
                          startTime: formatForBackend(startDate),
                          endTime: formatForBackend(endDate),
                          status: flashSaleForm.status,
                          products: editingFlashSale?.products || [] // Giữ nguyên sản phẩm hiện có khi sửa, hoặc mảng rỗng khi tạo mới
                        };

                        if (editingFlashSale) {
                          const response = await fetch(`${API_BASE_URL}/api/flashsales/${editingFlashSale.id}`, {
                            method: 'PUT',
                            headers: {
                              'Content-Type': 'application/json',
                              'Authorization': `Bearer ${localStorage.getItem('token')}`,
                            },
                            body: JSON.stringify(flashSaleData),
                          });
                          
                          if (!response.ok) {
                            const errorData = await response.json().catch(() => ({ message: 'Có lỗi xảy ra' }));
                            throw new Error(errorData.message || `Lỗi HTTP ${response.status}`);
                          }
                          
                          toast({
                            title: 'Thành công',
                            description: 'Đã cập nhật flash sale',
                          });
                        } else {
                          const response = await fetch(`${API_BASE_URL}/api/flashsales`, {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              'Authorization': `Bearer ${localStorage.getItem('token')}`,
                            },
                            body: JSON.stringify(flashSaleData),
                          });
                          
                          if (!response.ok) {
                            const errorData = await response.json().catch(() => ({ message: 'Có lỗi xảy ra' }));
                            throw new Error(errorData.message || `Lỗi HTTP ${response.status}`);
                          }
                          
                          toast({
                            title: 'Thành công',
                            description: 'Đã tạo flash sale',
                          });
                        }
                        
                        setShowFlashSaleDialog(false);
                        setEditingFlashSale(null);
                        loadFlashSales();
                      } catch (error) {
                        console.error('Error saving flash sale:', error);
                        toast({
                          title: 'Lỗi',
                          description: 'Không thể lưu flash sale',
                          variant: 'destructive',
                        });
                      }
                    }}
                  >
                    {editingFlashSale ? 'Cập nhật' : 'Tạo Flash Sale'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

          </Tabs>
        </div>
      </div>
    </AdminGuard>
  );
};

export default Admin;