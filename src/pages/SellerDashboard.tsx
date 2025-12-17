import { useState, useEffect, useMemo, useRef } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Home,
  Package,
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Users,
  Eye,
  Edit,
  Trash2,
  Plus,
  Search,
  Filter,
  Download,
  Star,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Package2,
  FileText,
  BarChart3,
  Settings,
  Truck,
  X,
  Bell,
  MessageCircle,
  Send,
  User,
  Shield,
  Zap,
  Calendar,
  Percent
} from "lucide-react";
import { SellerGuard } from "@/components/SellerGuard";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { adminOrderService, userService } from "@/services/adminService";
import { productService } from "@/services/productService";
import { isProductInCategory, categoryMatchers } from "@/utils/categoryMatcher";
import { notificationService, Notification as NotificationModel } from "@/services/notificationService";
import { messageService, Conversation, Message as ConversationMessage } from "@/services/messageService";
import { flashSaleService, FlashSale, FlashSaleProduct } from "@/services/flashSaleService";
import { Client, StompSubscription } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { subDays, format, eachDayOfInterval, startOfDay, endOfDay } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

type NotificationItem = {
  id: string;
  title: string;
  description: string;
  time: string;
  type: "order" | "inventory" | "system" | "review";
  priority?: "high" | "normal";
  unread?: boolean;
};

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || "";
const WS_ENDPOINT = API_BASE_URL ? `${API_BASE_URL}/ws` : "/ws";
const SELLER_PAYOUT_RATE = 0.85;

const SellerDashboard = () => {
  const { user, token } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([] as any[]);
  const [loading, setLoading] = useState(false);
  const [sellerId, setSellerId] = useState<string | null>(null);
  const [sellerInfo, setSellerInfo] = useState<any>(null);
  const [shopSettings, setShopSettings] = useState({
    businessName: '',
    description: '',
    contact: '',
    shippingAddress: ''
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [orderFilter, setOrderFilter] = useState<string>('all');
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [loadingOrderId, setLoadingOrderId] = useState<string | null>(null);
  const [productNames, setProductNames] = useState<{ [key: string]: string }>({});
  const [customerNames, setCustomerNames] = useState<{ [key: string]: string }>({});
  const [revenueChartPeriod, setRevenueChartPeriod] = useState<"7" | "30" | "90" | "all">("7");
  const [viewingProduct, setViewingProduct] = useState<any | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<any | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Add Product dialog state
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [addingProduct, setAddingProduct] = useState(false);
  const initialProductForm = {
    name: "",
    description: "",
    shortDescription: "",
    category: "",
    price: "",
    stock: "",
    status: "active",
    // Thông tin kỹ thuật
    weight: "",
    dimensions: "",
    origin: "",
    expiryDate: "",
    storage: "",
    ingredients: "",
    brand: "",
    unit: ""
  };
  const [addProductForm, setAddProductForm] = useState(initialProductForm);
  const [productImages, setProductImages] = useState<File[]>([]);
  const [detailImages, setDetailImages] = useState<File[]>([]);

  const [categoryOptions, setCategoryOptions] = useState<any[]>([]);
  const [sellerPrimaryCategory, setSellerPrimaryCategory] = useState<string | null>(null);
  const [allCategories, setAllCategories] = useState<any[]>([]);

  // Fetch categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await productService.getCategories();
        setAllCategories(data);
        // Ban đầu hiển thị tất cả categories, sẽ filter sau khi có seller info
        setCategoryOptions(data.map((cat: any) => ({ value: cat.name, label: cat.name })));
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };
    fetchCategories();
  }, []);

  // Stats
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    totalRevenue: 0,
    totalProducts: 0,
    activeProducts: 0,
    todayRevenue: 0,
    rating: 0,
    reviewCount: 0
  });

  const [notificationsList, setNotificationsList] = useState<NotificationModel[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const stompClientRef = useRef<Client | null>(null);
  const subscriptionsRef = useRef<StompSubscription[]>([]);
  const [analyticsRange, setAnalyticsRange] = useState<string>("30");

  // Flash Sale state
  const [flashSales, setFlashSales] = useState<FlashSale[]>([]);
  const [loadingFlashSales, setLoadingFlashSales] = useState(false);
  const [showAddProductToFlashSale, setShowAddProductToFlashSale] = useState(false);
  const [selectedFlashSale, setSelectedFlashSale] = useState<FlashSale | null>(null);
  const [editingProductInFlashSale, setEditingProductInFlashSale] = useState<{
    flashSaleId: string;
    product: FlashSaleProduct;
  } | null>(null);
  const [productFlashSaleForm, setProductFlashSaleForm] = useState<{
    productId: string;
    flashSalePrice: number;
    flashSaleStock: number;
    maxQuantityPerUser: number;
  } | null>(null);
  const [customAnalyticsRange, setCustomAnalyticsRange] = useState<{ start: string; end: string }>({
    start: "",
    end: ""
  });

  const normalizeConversationData = (conversation: Conversation): Conversation => ({
    ...conversation,
    messages: conversation?.messages ?? [],
  });

  const sortConversations = (items: Conversation[]) =>
    [...items].sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));

  const normalizeResponse = (payload: any) => {
    if (Array.isArray(payload)) return payload;
    if (payload && Array.isArray(payload.content)) return payload.content;
    return [];
  };

  const mergeConversationIntoList = (conversation: Conversation, options?: { forceActive?: boolean }): Conversation => {
    const normalized = normalizeConversationData(conversation);
    setConversations((prev) => {
      const exists = prev.some((item) => item.id === normalized.id);
      const updated = exists
        ? prev.map((item) => (item.id === normalized.id ? normalized : item))
        : [normalized, ...prev];
      return sortConversations(updated);
    });

    if (options?.forceActive) {
      setActiveConversation(normalized);
    } else {
      setActiveConversation((prev) => (prev && prev.id === normalized.id ? normalized : prev));
    }
    return normalized;
  };

  const fetchConversationDetail = async (conversationId: string, forceActive = true) => {
    try {
      const detail = await messageService.getConversation(conversationId);
      mergeConversationIntoList(detail, { forceActive });
    } catch (error) {
      console.error("Failed to load conversation detail", error);
      toast({
        title: "Lỗi",
        description: "Không thể tải hội thoại",
        variant: "destructive",
      });
    }
  };

  const recomputeStats = (overrideProducts?: any[], overrideOrders?: any[]) => {
    const p = overrideProducts ?? (products as any[]);
    const o = overrideOrders ?? (orders as any[]);

    const totalOrders = o.length;
    const lower = (s: any) => String(s || '').toLowerCase();
    const pendingOrders = o.filter(it => {
      const s = lower(it.status);
      return s === 'pending' || s === 'processing' || s === 'confirmed';
    }).length;
    const completedOrders = o.filter(it => lower(it.status) === 'completed' || lower(it.status) === 'delivered').length;
    // Doanh thu chỉ tính các đơn đã hoàn thành/giao thành công
    const revenueOrders = o.filter(it => {
      const s = lower(it.status);
      return s === 'completed' || s === 'delivered';
    });
    const getOrderTotal = (it: any) => Number(it.totalPrice ?? it.totalAmount ?? 0);
    const totalRevenue = revenueOrders.reduce((sum, it) => sum + getOrderTotal(it), 0);
    const totalProducts = p.length;
    const activeProducts = p.filter(it => {
      const s = lower(it.status);
      return s === 'active' || s === 'approved';
    }).length;
    const todayStr = new Date().toDateString();
    const todayRevenue = revenueOrders
      .filter(it => it.createdAt && new Date(it.createdAt).toDateString() === todayStr)
      .reduce((sum, it) => sum + getOrderTotal(it), 0);
    const sellerReviewCount = p.reduce((sum, prod) => sum + Number(prod.reviewCount || 0), 0);
    const sellerRatingTotal = p.reduce((sum, prod) => {
      const rating = Number(prod.rating || 0);
      const count = Number(prod.reviewCount || 0);
      return sum + rating * count;
    }, 0);
    const averageRating = sellerReviewCount > 0 ? sellerRatingTotal / sellerReviewCount : 0;

    setStats(prev => ({
      ...prev,
      totalOrders,
      pendingOrders,
      completedOrders,
      totalRevenue,
      totalProducts,
      activeProducts,
      todayRevenue,
      rating: Number(averageRating.toFixed(1)),
      reviewCount: sellerReviewCount,
    }));
  };

  const getConversationDisplayName = (conversation: Conversation) => {
    const fullName = customerNames[conversation.customerId];
    const fallback = conversation.customerId || "Khách hàng";
    if (fullName && fullName.trim().length > 0) return fullName;
    return fallback;
  };

  const getLastMessage = (conversation: Conversation) => {
    const history = conversation.messages ?? [];
    return history.length > 0 ? history[history.length - 1] : null;
  };

  const isConversationUnread = (conversation: Conversation) => {
    const last = getLastMessage(conversation);
    if (!last || last.role !== "customer") return false;
    if (activeConversation && activeConversation.id === conversation.id) {
      const activeLast = getLastMessage(activeConversation);
      if (activeLast && activeLast.timestamp === last.timestamp) {
        return false;
      }
    }
    return true;
  };

  const unreadMessageCount = useMemo(() => {
    return conversations.reduce((count, convo) => count + (isConversationUnread(convo) ? 1 : 0), 0);
  }, [conversations, activeConversation]);

  const renderTabBadge = (count: number) => (
    <Badge
      className={`absolute -top-1 -right-1 min-w-[20px] h-5 flex items-center justify-center px-1 text-xs ${count > 0 ? "bg-red-500 text-white" : "bg-muted text-muted-foreground border border-muted-foreground/40"
        }`}
    >
      {count > 99 ? "99+" : count}
    </Badge>
  );

  const formatMessageTimestamp = (timestamp?: number) => {
    if (!timestamp) return "";
    return new Date(timestamp).toLocaleString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
    });
  };

  const handleSelectConversation = (conversationId: string) => {
    fetchConversationDetail(conversationId, true);
  };

  const handleSendMessage = async () => {
    if (!activeConversation || !chatInput.trim()) return;
    try {
      setIsSendingMessage(true);
      const outgoing: ConversationMessage = {
        senderId: user?.id || "",
        senderName: user?.fullName || user?.username || "Seller",
        role: "seller",
        content: chatInput.trim(),
        timestamp: Date.now(),
      };
      const updated = await messageService.sendMessage(activeConversation.id, outgoing);
      mergeConversationIntoList(updated, { forceActive: true });
      setChatInput("");
    } catch (error) {
      console.error("Failed to send message", error);
      toast({
        title: "Không gửi được tin nhắn",
        description: error instanceof Error ? error.message : "Đã xảy ra lỗi bất ngờ",
        variant: "destructive",
      });
    } finally {
      setIsSendingMessage(false);
    }
  };

  useEffect(() => {
    const loadSellerInfo = async () => {
      if (!user?.id) return;

      try {
        const response = await fetch(`${API_BASE_URL}/api/sellers/check/${user.id}`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : undefined,
        });
        if (response.ok) {
          const data = await response.json();
          if (data.isSeller && data.seller) {
            setSellerId(data.seller.id);
            // Lấy loại sản phẩm chính từ seller (farmType chứa category đã chọn khi đăng ký)
            const primaryCategory = data.seller.farmType;
            if (primaryCategory) {
              setSellerPrimaryCategory(primaryCategory);
              
              // Helper function để kiểm tra xem primaryCategory có match với category name không
              const matchesCategory = (catName: string, primary: string): boolean => {
                const normalizeString = (str: string) => 
                  str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
                
                const catNameLower = catName.toLowerCase().trim();
                const primaryLower = primary.toLowerCase().trim();
                
                // 1. Exact match (case-insensitive)
                if (catNameLower === primaryLower) {
                  return true;
                }
                
                // 2. Normalized match (không dấu)
                const normalizedCat = normalizeString(catName);
                const normalizedPrimary = normalizeString(primary);
                if (normalizedCat === normalizedPrimary) {
                  return true;
                }
                
                // 3. Kiểm tra xem primaryCategory có trong keywords của category không
                // Ví dụ: primaryCategory = "vegetables", catName = "Rau Củ"
                // categoryMatchers['Rau củ'].keywords = ['rau củ', 'rau cu', 'vegetable', 'vegetables']
                // Tìm matcher bằng cách so sánh không phân biệt hoa thường và dấu
                let matcher = categoryMatchers[catName];
                if (!matcher) {
                  // Thử tìm với key không phân biệt hoa thường
                  for (const [key, value] of Object.entries(categoryMatchers)) {
                    const keyLower = key.toLowerCase().trim();
                    const normalizedKey = normalizeString(key);
                    if (keyLower === catNameLower || normalizedKey === normalizedCat) {
                      matcher = value;
                      break;
                    }
                  }
                }
                
                if (matcher) {
                  // Kiểm tra keywords - primaryCategory có trong keywords không?
                  for (const keyword of matcher.keywords) {
                    const keywordLower = keyword.toLowerCase().trim();
                    if (keywordLower === primaryLower) {
                      return true;
                    }
                    // Kiểm tra normalized
                    if (normalizeString(keyword) === normalizedPrimary) {
                      return true;
                    }
                  }
                  // Kiểm tra aliases
                  for (const alias of matcher.aliases) {
                    const aliasLower = alias.toLowerCase().trim();
                    if (aliasLower === primaryLower) {
                      return true;
                    }
                    if (normalizeString(alias) === normalizedPrimary) {
                      return true;
                    }
                  }
                }
                
                // 4. Kiểm tra ngược lại: tìm category có primaryCategory trong keywords
                // Ví dụ: primaryCategory = "vegetables", tìm category nào có "vegetables" trong keywords
                for (const [key, value] of Object.entries(categoryMatchers)) {
                  // Kiểm tra xem key có match với catName không (không phân biệt hoa thường, dấu)
                  const keyLower = key.toLowerCase().trim();
                  const normalizedKey = normalizeString(key);
                  const keyMatchesCat = keyLower === catNameLower || 
                                       normalizedKey === normalizedCat ||
                                       catNameLower.includes(keyLower) ||
                                       keyLower.includes(catNameLower);
                  
                  if (keyMatchesCat) {
                    // Kiểm tra xem primaryCategory có trong keywords của category này không
                    for (const keyword of value.keywords) {
                      const keywordLower = keyword.toLowerCase().trim();
                      if (keywordLower === primaryLower || normalizeString(keyword) === normalizedPrimary) {
                        return true;
                      }
                    }
                    // Kiểm tra aliases
                    for (const alias of value.aliases) {
                      const aliasLower = alias.toLowerCase().trim();
                      if (aliasLower === primaryLower || normalizeString(alias) === normalizedPrimary) {
                        return true;
                      }
                    }
                  }
                }
                
                return false;
              };
              
              // Filter categories chỉ hiển thị category phù hợp
              const filtered = allCategories.filter((cat: any) => {
                return matchesCategory(cat.name, primaryCategory);
              });
              
              if (filtered.length > 0) {
                // Chỉ hiển thị category đã match
                setCategoryOptions(filtered.map((cat: any) => ({ value: cat.name, label: cat.name })));
                console.log('✅ Filtered categories:', filtered.map((c: any) => c.name), 'for primary:', primaryCategory);
              } else {
                // Nếu không tìm thấy, log để debug
                console.warn('⚠️ Primary category not found in categories list:', primaryCategory);
                console.warn('Available categories:', allCategories.map((c: any) => c.name));
                // Vẫn hiển thị tất cả nhưng sẽ validate khi submit
              }
            }
          }
        }
      } catch (error) {
        console.error('Error loading seller info:', error);
      }
    };

    if (allCategories.length > 0) {
      loadSellerInfo();
    }
  }, [user?.id, allCategories, token]);

  useEffect(() => {
    if (sellerId) {
      loadStats();
      loadProducts();
      loadOrders();
      loadShopSettings();
    }
  }, [sellerId]);

  // Load shop settings from seller info
  const loadShopSettings = async () => {
    if (!sellerId || !user?.id) return;
    
    try {
      // Load seller info
      const sellerResponse = await fetch(`${API_BASE_URL}/api/sellers/${sellerId}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : undefined,
      });
      
      let sellerData: any = null;
      if (sellerResponse.ok) {
        sellerData = await sellerResponse.json();
        setSellerInfo(sellerData);
      }
      
      // Load user profile to get address
      const userResponse = await fetch('http://localhost:8081/api/user/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      let userAddress = '';
      let userWard = '', userDistrict = '', userCity = '';
      if (userResponse.ok) {
        const userData = await userResponse.json();
        userWard = userData.addressWard || '';
        userDistrict = userData.addressDistrict || '';
        userCity = userData.addressCity || '';
        // Build address from user profile (addressStreet, addressWard, addressDistrict, addressCity)
        const userLocationParts = [
          userData.addressWard,
          userData.addressDistrict,
          userData.addressCity,
        ].filter(Boolean);
        userAddress = userLocationParts.join(", ") || userData.addressStreet || '';
      }
      
      // Build shipping address from seller address fields, fallback to user profile address
      const sellerLocationParts = [
        sellerData?.ward,
        sellerData?.district,
        sellerData?.city || sellerData?.province,
      ].filter(Boolean);
      const sellerAddress = sellerLocationParts.join(", ") || sellerData?.address || '';
      
      // Use seller address if available, otherwise use user profile address
      const shippingAddress = sellerAddress || userAddress;
      
      // If seller doesn't have address but user does, sync it to seller
      if (!sellerAddress && userAddress && sellerData) {
        // This will be synced when user saves, but we can pre-populate the form
      }
      
      setShopSettings({
        businessName: sellerData?.businessName || sellerData?.contactPerson || '',
        description: sellerData?.description || '',
        contact: sellerData?.phone || sellerData?.contactPhone || sellerData?.email || sellerData?.contactEmail || '',
        shippingAddress: shippingAddress
      });
    } catch (error) {
      console.error('Error loading shop settings:', error);
    }
  };

  // Save shop settings
  const handleSaveShopSettings = async () => {
    if (!sellerId) return;
    
    setIsSavingSettings(true);
    try {
      // Parse shipping address to extract ward, district, city
      const addressParts = shopSettings.shippingAddress.split(',').map(s => s.trim());
      let ward = '', district = '', city = '';
      
      if (addressParts.length >= 3) {
        ward = addressParts[0];
        district = addressParts[1];
        city = addressParts[2];
      } else if (addressParts.length === 2) {
        district = addressParts[0];
        city = addressParts[1];
      } else if (addressParts.length === 1 && addressParts[0]) {
        city = addressParts[0];
      }
      
      const updateData: any = {
        businessName: shopSettings.businessName,
        description: shopSettings.description,
      };
      
      // Update contact info
      if (shopSettings.contact.includes('@')) {
        updateData.email = shopSettings.contact;
      } else {
        updateData.phone = shopSettings.contact;
      }
      
      // Update address fields
      if (shopSettings.shippingAddress) {
        updateData.address = shopSettings.shippingAddress;
        if (ward) updateData.ward = ward;
        if (district) updateData.district = district;
        if (city) updateData.city = city;
      }
      
      const response = await fetch(`${API_BASE_URL}/api/sellers/${sellerId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(updateData),
      });
      
      if (response.ok) {
        // Also update user profile address to sync
        try {
          // Parse address to extract components (format: ward, district, city)
          const addressParts = shopSettings.shippingAddress.split(',').map(s => s.trim());
          let ward = '', district = '', city = '';
          
          if (addressParts.length >= 3) {
            ward = addressParts[0];
            district = addressParts[1];
            city = addressParts[2];
          } else if (addressParts.length === 2) {
            district = addressParts[0];
            city = addressParts[1];
          } else if (addressParts.length === 1 && addressParts[0]) {
            city = addressParts[0];
          }
          
          // Update user profile address with the same components
          const userProfileResponse = await fetch(`${API_BASE_URL}/api/user/profile`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              addressStreet: shopSettings.shippingAddress, // Use full address as street
              addressWard: ward,
              addressDistrict: district,
              addressCity: city
            })
          });
          
          if (!userProfileResponse.ok) {
            console.warn('Failed to sync address to user profile');
          }
        } catch (syncError) {
          console.error('Error syncing address to user profile:', syncError);
          // Don't fail the whole operation if sync fails
        }
        
        toast({
          title: "Thành công",
          description: "Đã cập nhật thông tin cửa hàng",
        });
        // Reload settings
        await loadShopSettings();
      } else {
        const error = await response.json().catch(() => ({ message: 'Failed to update shop settings' }));
        throw new Error(error.message || 'Failed to update shop settings');
      }
    } catch (error: any) {
      console.error('Error saving shop settings:', error);
      toast({
        title: "Lỗi",
        description: error.message || "Không thể cập nhật thông tin cửa hàng",
        variant: "destructive",
      });
    } finally {
      setIsSavingSettings(false);
    }
  };

  const loadFlashSales = async () => {
    if (!sellerId) return;
    try {
      setLoadingFlashSales(true);
      // Load active and upcoming flash sales that seller can participate in
      const [activeFlashSales, upcomingFlashSales] = await Promise.all([
        flashSaleService.getActiveFlashSales(),
        flashSaleService.getUpcomingFlashSales(),
      ]);
      const allAvailableFlashSales = [...activeFlashSales, ...upcomingFlashSales];
      setFlashSales(allAvailableFlashSales);
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

  // Load flash sales when seller is loaded
  useEffect(() => {
    if (sellerId) {
      loadFlashSales();
    }
  }, [sellerId]);

  useEffect(() => {
    if (!user?.id) return;
    notificationService.getSellerNotifications(user.id)
      .then(setNotificationsList)
      .catch(e => console.error("Failed to fetch notifications", e));
  }, [user?.id]);

  useEffect(() => {
    if (!sellerId) {
      setConversations([]);
      setActiveConversation(null);
      return;
    }
    let cancelled = false;
    const loadConversations = async () => {
      try {
        const data = await messageService.getConversationsBySeller(sellerId);
        if (cancelled) return;
        const normalized = sortConversations(data.map(normalizeConversationData));
        setConversations(normalized);
        if (normalized.length > 0) {
          fetchConversationDetail(normalized[0].id, true);
        } else {
          setActiveConversation(null);
        }
      } catch (error) {
        console.error("Failed to fetch conversations", error);
      }
    };
    loadConversations();
    return () => {
      cancelled = true;
    };
  }, [sellerId]);

  useEffect(() => {
    if (analyticsRange !== "custom" && (customAnalyticsRange.start || customAnalyticsRange.end)) {
      setCustomAnalyticsRange({ start: "", end: "" });
    }
  }, [analyticsRange]);

  useEffect(() => {
    if (!sellerId) return;

    const client = new Client({
      webSocketFactory: () => new SockJS(WS_ENDPOINT),
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
      reconnectDelay: 5000,
      debug: (str) => console.debug(`[WS] ${str}`),
    });

    client.onConnect = () => {
      const subscription = client.subscribe(`/topic/seller/${sellerId}/conversations`, (message) => {
        try {
          const payload = JSON.parse(message.body) as Conversation;
          mergeConversationIntoList(payload);
        } catch (error) {
          console.error("Failed to parse realtime conversation payload", error);
        }
      });
      subscriptionsRef.current.push(subscription);
    };

    client.onStompError = (frame) => {
      console.error("Broker error:", frame.headers["message"], frame.body);
    };

    client.activate();
    stompClientRef.current = client;

    return () => {
      subscriptionsRef.current.forEach((sub) => sub.unsubscribe());
      subscriptionsRef.current = [];
      client.deactivate();
      stompClientRef.current = null;
    };
  }, [sellerId, token]);

  const loadStats = async () => {
    recomputeStats();
  };

  const loadProducts = async () => {
    if (!sellerId) return;
    if (!token) {
      toast({
        title: "Thiếu quyền",
        description: "Vui lòng đăng nhập lại để xem sản phẩm của bạn",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/products/seller/${sellerId}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : undefined,
      });
      if (response.ok) {
        const data = await response.json();
        const productList = normalizeResponse(data);
        setProducts(productList);
        recomputeStats(productList, undefined);
      }
    } catch (error) {
      console.error('Error loading products:', error);
      toast({
        title: "Lỗi",
        description: "Không thể tải danh sách sản phẩm",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadOrders = async () => {
    if (!sellerId) return;
    if (!token) {
      toast({
        title: "Thiếu quyền",
        description: "Vui lòng đăng nhập lại để xem đơn hàng",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoadingOrders(true);
      const response = await fetch(`${API_BASE_URL}/api/orders/seller/${sellerId}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : undefined,
      });
      if (response.ok) {
        const data = await response.json();
        const orderList = normalizeResponse(data);
        setOrders(orderList);
        recomputeStats(undefined, orderList);

        // Fetch product names for all order items
        const productIds = new Set<string>();
        const customerIds = new Set<string>();

        orderList.forEach((order: any) => {
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

        // Fetch product names
        const productNamesMap: { [key: string]: string } = {};
        for (const productId of productIds) {
          try {
            const product = await productService.getProductById(productId);
            if (product) {
              productNamesMap[productId] = product.name;
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
        setCustomerNames(customerNamesMap);
      }
    } catch (error) {
      console.error('Error loading orders:', error);
      toast({
        title: "Lỗi",
        description: "Không thể tải danh sách đơn hàng",
        variant: "destructive"
      });
    } finally {
      setIsLoadingOrders(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('vi-VN');
  };

  const totalProductCount = products.length;
  const activeProductCount = useMemo(() => {
    return products.filter((product: any) => {
      const status = String(product.status || '').toLowerCase();
      return status === 'active' || status === 'approved';
    }).length;
  }, [products]);

  const filteredOrders = useMemo(() => {
    if (!orders || orders.length === 0) return [];
    let startDate: Date | null = null;
    let endDate: Date | null = null;
    const now = new Date();
    switch (analyticsRange) {
      case "7":
        startDate = subDays(now, 7);
        break;
      case "30":
        startDate = subDays(now, 30);
        break;
      case "90":
        startDate = subDays(now, 90);
        break;
      case "all":
        startDate = null;
        break;
      case "custom":
        startDate = customAnalyticsRange.start ? new Date(customAnalyticsRange.start) : null;
        endDate = customAnalyticsRange.end ? new Date(customAnalyticsRange.end) : null;
        if (endDate) {
          endDate.setHours(23, 59, 59, 999);
        }
        break;
    }
    return orders.filter((order: any) => {
      if (!order.createdAt) return true;
      const created = new Date(order.createdAt);
      if (startDate && created < startDate) return false;
      if (endDate && created > endDate) return false;
      return true;
    });
  }, [orders, analyticsRange, customAnalyticsRange]);

  const analyticsRevenue = useMemo(() => {
    return filteredOrders.reduce((sum, order: any) => {
      const value = Number(order.totalAmount ?? order.totalPrice ?? 0);
      return sum + value;
    }, 0);
  }, [filteredOrders]);

  const analyticsOrdersCount = filteredOrders.length;

  const analyticsCompletedOrders = useMemo(() => {
    return filteredOrders.filter((order: any) => {
      const status = String(order.status || '').toLowerCase();
      return status === 'delivered' || status === 'completed';
    }).length;
  }, [filteredOrders]);

  const analyticsAverageOrderValue = analyticsOrdersCount > 0 ? analyticsRevenue / analyticsOrdersCount : 0;
  const analyticsCompletionRate = analyticsOrdersCount > 0 ? (analyticsCompletedOrders / analyticsOrdersCount) * 100 : 0;
  const netTotalRevenue = useMemo(() => stats.totalRevenue * SELLER_PAYOUT_RATE, [stats.totalRevenue]);
  const netAnalyticsRevenue = analyticsRevenue * SELLER_PAYOUT_RATE;
  const netAnalyticsAverageOrderValue = analyticsAverageOrderValue * SELLER_PAYOUT_RATE;

  // Calculate revenue data for chart
  const revenueChartData = useMemo(() => {
    const now = new Date();
    let startDate: Date;
    
    switch (revenueChartPeriod) {
      case "7":
        startDate = subDays(now, 7);
        break;
      case "30":
        startDate = subDays(now, 30);
        break;
      case "90":
        startDate = subDays(now, 90);
        break;
      default:
        // For "all", use the earliest order date or 90 days ago, whichever is more recent
        const earliestOrder = orders.length > 0 
          ? orders.reduce((earliest, order: any) => {
              const orderDate = order.createdAt ? new Date(order.createdAt) : null;
              if (!orderDate) return earliest;
              if (!earliest) return orderDate;
              return orderDate < earliest ? orderDate : earliest;
            }, null as Date | null)
          : null;
        startDate = earliestOrder && earliestOrder < subDays(now, 90) 
          ? earliestOrder 
          : subDays(now, 90);
    }

    // Get all days in the range
    const days = eachDayOfInterval({
      start: startOfDay(startDate),
      end: endOfDay(now)
    });

    // Filter orders that are completed/delivered
    const revenueOrders = orders.filter((order: any) => {
      const status = String(order.status || '').toLowerCase();
      return status === 'completed' || status === 'delivered';
    });

    // Calculate revenue per day
    const dailyRevenue = days.map(day => {
      const dayStart = startOfDay(day);
      const dayEnd = endOfDay(day);
      
      const dayOrders = revenueOrders.filter((order: any) => {
        if (!order.createdAt) return false;
        const orderDate = new Date(order.createdAt);
        return orderDate >= dayStart && orderDate <= dayEnd;
      });

      const revenue = dayOrders.reduce((sum, order: any) => {
        return sum + Number(order.totalPrice ?? order.totalAmount ?? 0);
      }, 0);

      return {
        date: format(day, 'dd/MM'),
        fullDate: format(day, 'dd/MM/yyyy'),
        revenue: revenue,
        netRevenue: revenue * SELLER_PAYOUT_RATE,
        orders: dayOrders.length
      };
    });

    return dailyRevenue;
  }, [orders, revenueChartPeriod]);

  const bestSellingProducts = useMemo(() => {
    const tally: Record<string, { name: string; quantity: number }> = {};
    filteredOrders.forEach((order: any) => {
      (order.items || []).forEach((item: any) => {
        const key = item.productId || item.nameSnapshot || `unknown-${item.id || Math.random()}`;
        if (!tally[key]) {
          tally[key] = {
            name: productNames[item.productId] || item.nameSnapshot || 'Sản phẩm',
            quantity: 0,
          };
        }
        tally[key].quantity += Number(item.quantity || 0);
      });
    });
    return Object.values(tally)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 3);
  }, [filteredOrders, productNames]);

  const getNotificationIcon = (type: NotificationItem["type"]) => {
    if (type === "order") {
      return <ShoppingBag className="h-10 w-10 text-primary" />;
    }
    if (type === "inventory") {
      return <Package className="h-10 w-10 text-orange-500" />;
    }
    if (type === "system") {
      return <Shield className="h-10 w-10 text-gray-500" />;
    }
    if (type === "review") {
      return <Star className="h-10 w-10 text-yellow-500" />;
    }
    return <Bell className="h-10 w-10 text-blue-500" />;
  };

  const handleMarkNotificationRead = (id: string) => {
    setNotificationsList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, unread: false } : item))
    );
  };

  const handleMarkAllNotifications = () => {
    setNotificationsList((prev) => prev.map((item) => ({ ...item, unread: false })));
  };

  const getOrderStatusBadge = (status: string) => {
    const key = String(status || '').toLowerCase();
    const statusMap: { [key: string]: { label: string; variant: "default" | "secondary" | "destructive" | "outline" } } = {
      'processing': { label: 'Chờ xử lý', variant: 'secondary' },
      'pending': { label: 'Chờ xử lý', variant: 'secondary' },
      'confirmed': { label: 'Đã xác nhận', variant: 'default' },
      'packed': { label: 'Đã đóng gói', variant: 'default' },
      'handover': { label: 'Đã bàn giao', variant: 'default' },
      'shipping': { label: 'Đang giao', variant: 'default' },
      'delivered': { label: 'Đã giao', variant: 'outline' },
      'completed': { label: 'Hoàn thành', variant: 'outline' },
      'cancelled': { label: 'Đã hủy', variant: 'destructive' }
    };
    const statusInfo = statusMap[key] || statusMap['processing'];
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  // Order action handlers
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

  // Quick actions handlers
  const resetAddProductState = () => {
    setAddProductForm(initialProductForm);
    setProductImages([]);
    setDetailImages([]);
    setIsEditMode(false);
    setEditingProductId(null);
  };

  const handleAddProductOpen = () => {
    resetAddProductState();
    setShowAddProduct(true);
  };

  const handleAddProductDialogChange = (open: boolean) => {
    setShowAddProduct(open);
    if (!open) {
      resetAddProductState();
    }
  };
  const handleProcessOrders = () => setActiveTab("orders");
  const handleOpenSettings = () => setActiveTab("settings");

  const handleExportProducts = () => {
    try {
      const headers = [
        'ID', 'Tên', 'Danh mục', 'Giá', 'Tồn kho', 'Trạng thái', 'Ngày tạo'
      ];
      const rows = (products as any[]).map(p => [
        p.id || '',
        (p.name || '').toString().replace(/\n|\r/g, ' '),
        p.category || '',
        p.price ?? '',
        p.stock ?? '',
        p.status || '',
        p.createdAt ? new Date(p.createdAt).toLocaleString('vi-VN') : ''
      ]);
      const csv = [headers, ...rows]
        .map(r => r.map(v => {
          const s = String(v ?? '');
          return s.includes(',') || s.includes('"') || s.includes('\n') ? '"' + s.replace(/"/g, '""') + '"' : s;
        }).join(','))
        .join('\n');
      const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `products_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: 'Đã xuất báo cáo', description: 'Danh sách sản phẩm đã được tải xuống.' });
    } catch (e) {
      toast({ title: 'Lỗi', description: 'Không thể xuất báo cáo', variant: 'destructive' });
    }
  };

  const handleViewProduct = (product: any) => {
    setViewingProduct(product);
  };

  const handleEditProduct = async (product: any) => {
    setIsEditMode(true);
    setEditingProductId(product.id || null);
    
    // Load chi tiết sản phẩm từ database để lấy đầy đủ thông tin
    try {
      const productDetail = await productService.getProductById(product.id);
      
      // Debug: log để kiểm tra
      console.log('=== EDIT PRODUCT DEBUG ===');
      console.log('Product ID:', product.id);
      console.log('Product detail from API (full):', JSON.stringify(productDetail, null, 2));
      console.log('Product detail keys:', productDetail ? Object.keys(productDetail) : 'null');
      
      // Kiểm tra từng trường thông tin kỹ thuật
      console.log('Technical fields check:');
      console.log('  weight:', productDetail?.weight, product?.weight);
      console.log('  unit:', productDetail?.unit, product?.unit);
      console.log('  dimensions:', productDetail?.dimensions, product?.dimensions);
      console.log('  origin:', productDetail?.origin, product?.origin);
      console.log('  brand:', productDetail?.brand, product?.brand);
      console.log('  expiryDate:', productDetail?.expiryDate, product?.expiryDate);
      console.log('  expiry_date:', productDetail?.expiry_date, product?.expiry_date);
      console.log('  storage:', productDetail?.storage, product?.storage);
      console.log('  ingredients:', productDetail?.ingredients, product?.ingredients);
      
      // Lấy thông tin kỹ thuật từ specifications object hoặc từ các trường riêng
      const specs = productDetail?.specifications || product?.specifications || {};
      console.log('Specifications object:', JSON.stringify(specs, null, 2));
      
      const formData = {
        name: productDetail?.name || product.name || "",
        description: productDetail?.description || product.description || "",
        shortDescription: productDetail?.shortDescription || product.shortDescription || "",
        category: productDetail?.category || product.category || "",
        price: productDetail?.price != null ? String(productDetail.price) : (product.price != null ? String(product.price) : ""),
        stock: productDetail?.stock != null ? String(productDetail.stock) : (product.stock != null ? String(product.stock) : ""),
        status: productDetail?.status || product.status || "active",
        // Thông tin kỹ thuật - ưu tiên lấy từ productDetail trước, thử nhiều tên trường
        weight: productDetail?.weight || product?.weight || productDetail?.weightValue || product?.weightValue || specs['Trọng lượng'] || specs['Weight'] || "",
        unit: productDetail?.unit || product?.unit || productDetail?.unitValue || product?.unitValue || specs['Đơn vị'] || specs['Unit'] || "",
        // dimensions, ingredients, brand được lưu trong specifications
        dimensions: specs['Kích thước'] || specs['Dimensions'] || productDetail?.dimensions || product?.dimensions || productDetail?.dimension || product?.dimension || "",
        origin: productDetail?.origin || product?.origin || productDetail?.originCountry || product?.originCountry || specs['Xuất xứ'] || specs['Origin'] || "",
        expiryDate: productDetail?.expiryDate || product?.expiryDate || productDetail?.expiry_date || product?.expiry_date || productDetail?.expiry || product?.expiry || specs['Hạn sử dụng'] || specs['Expiry Date'] || "",
        storage: productDetail?.storageInstructions || product?.storageInstructions || productDetail?.storage || product?.storage || productDetail?.storageMethod || product?.storageMethod || specs['Bảo quản'] || specs['Storage'] || "",
        ingredients: specs['Thành phần'] || specs['Ingredients'] || productDetail?.ingredients || product?.ingredients || productDetail?.ingredient || product?.ingredient || "",
        brand: specs['Thương hiệu'] || specs['Brand'] || productDetail?.brand || product?.brand || productDetail?.brandName || product?.brandName || ""
      };
      
      console.log('Form data to set:', JSON.stringify(formData, null, 2));
      console.log('=== END DEBUG ===');
      
      setAddProductForm(formData);
    } catch (error) {
      console.error('Error loading product details:', error);
      // Nếu không load được từ API, dùng dữ liệu từ product object
      const specs = product?.specifications || {};
      setAddProductForm({
        name: product.name || "",
        description: product.description || "",
        shortDescription: product.shortDescription || "",
        category: product.category || "",
        price: product.price != null ? String(product.price) : "",
        stock: product.stock != null ? String(product.stock) : "",
        status: product.status || "active",
        // Thông tin kỹ thuật - lấy từ specifications object hoặc từ trường riêng
        weight: product.weight || specs['Trọng lượng'] || specs['Weight'] || "",
        dimensions: product.dimensions || specs['Kích thước'] || specs['Dimensions'] || "",
        origin: product.origin || specs['Xuất xứ'] || specs['Origin'] || "",
        expiryDate: product.expiryDate || specs['Hạn sử dụng'] || specs['Expiry Date'] || "",
        storage: product.storage || specs['Bảo quản'] || specs['Storage'] || "",
        ingredients: product.ingredients || specs['Thành phần'] || specs['Ingredients'] || "",
        brand: product.brand || specs['Thương hiệu'] || specs['Brand'] || "",
        unit: product.unit || specs['Đơn vị'] || specs['Unit'] || ""
      });
    }
    
    setProductImages([]);
    setDetailImages([]);
    setShowAddProduct(true);
  };

  const handleDeleteProduct = (product: any) => {
    setDeletingProduct(product);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteProduct = async () => {
    if (!deletingProduct?.id) {
      setShowDeleteConfirm(false);
      return;
    }

    try {
      setDeleting(true);
      await productService.deleteProduct(deletingProduct.id);
      toast({ title: 'Đã xóa', description: `Sản phẩm "${deletingProduct.name}" đã được xóa.` });
      setShowDeleteConfirm(false);
      setDeletingProduct(null);
      setDeleting(false);
      await loadProducts();
    } catch (error: any) {
      console.error('Delete product error:', error);
      toast({ title: 'Lỗi', description: error?.message || 'Không thể xóa sản phẩm', variant: 'destructive' });
      setDeleting(false);
    }
  };

  const closeDeleteDialog = () => {
    setShowDeleteConfirm(false);
    setDeletingProduct(null);
    setDeleting(false);
  };

  const closeViewDialog = () => {
    setViewingProduct(null);
  };

  const handleSubmitAddProduct = async () => {
    if (!sellerId) return;
    if (!token) {
      toast({
        title: "Thiếu quyền",
        description: "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại",
        variant: "destructive"
      });
      return;
    }
    if (!addProductForm.name.trim() || !addProductForm.description.trim()) {
      toast({ title: 'Thiếu thông tin', description: 'Vui lòng nhập tên và mô tả sản phẩm', variant: 'destructive' });
      return;
    }
    if (!editingProductId && productImages.length === 0) {
      toast({ title: 'Thiếu ảnh', description: 'Vui lòng thêm ít nhất 1 ảnh sản phẩm', variant: 'destructive' });
      return;
    }

    // Validate category nếu seller có primaryCategory
    if (sellerPrimaryCategory && addProductForm.category) {
      // Sử dụng cùng logic match như khi filter
      const normalizeString = (str: string) => 
        str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
      
      const categoryLower = addProductForm.category.toLowerCase().trim();
      const primaryLower = sellerPrimaryCategory.toLowerCase().trim();
      
      let isValid = false;
      
      // 1. Exact match
      if (categoryLower === primaryLower) {
        isValid = true;
      }
      
      // 2. Normalized match
      if (!isValid && normalizeString(addProductForm.category) === normalizeString(sellerPrimaryCategory)) {
        isValid = true;
      }
      
      // 3. Kiểm tra qua categoryMatchers
      if (!isValid) {
        const matcher = categoryMatchers[addProductForm.category];
        if (matcher) {
          if (matcher.keywords.some(k => k.toLowerCase() === primaryLower) ||
              matcher.aliases.some(a => a.toLowerCase() === primaryLower)) {
            isValid = true;
          }
        }
      }
      
      if (!isValid) {
        toast({ 
          title: 'Lỗi', 
          description: `Bạn chỉ được đăng sản phẩm thuộc loại "${sellerPrimaryCategory}". Vui lòng chọn đúng loại sản phẩm.`,
          variant: 'destructive' 
        });
        return;
      }
    }

    try {
      setAddingProduct(true);
      if (editingProductId) {
        const payload: any = {
          name: addProductForm.name.trim(),
          description: addProductForm.description.trim(),
          shortDescription: addProductForm.shortDescription.trim() || undefined,
          category: addProductForm.category || undefined,
          price: addProductForm.price ? parseFloat(addProductForm.price) : undefined,
          stock: addProductForm.stock ? parseInt(addProductForm.stock) : undefined,
          status: addProductForm.status || undefined,
          // Thông tin kỹ thuật - gửi tất cả các trường để lưu vào DB
          weight: addProductForm.weight?.trim() || "",
          dimensions: addProductForm.dimensions?.trim() || "",
          origin: addProductForm.origin?.trim() || "",
          expiryDate: addProductForm.expiryDate?.trim() || "",
          storageInstructions: addProductForm.storage?.trim() || "", // Backend dùng storageInstructions
          ingredients: addProductForm.ingredients?.trim() || "",
          brand: addProductForm.brand?.trim() || "",
          unit: addProductForm.unit?.trim() || "",
        };

        if (productImages.length > 0) {
          payload.images = productImages;
        }
        if (detailImages.length > 0) {
          payload.detailImages = detailImages;
        }

        console.log('=== UPDATE PRODUCT PAYLOAD ===');
        console.log('Product ID:', editingProductId);
        console.log('Payload:', JSON.stringify(payload, null, 2));
        console.log('=== END UPDATE PAYLOAD ===');

        await productService.updateProduct(editingProductId, payload);
        toast({ title: 'Thành công', description: 'Đã cập nhật sản phẩm' });
        setShowAddProduct(false);
        resetAddProductState();
        await loadProducts();
        return;
      }

      // Validate category nếu seller có primaryCategory
      if (sellerPrimaryCategory && addProductForm.category) {
        if (addProductForm.category.toLowerCase() !== sellerPrimaryCategory.toLowerCase()) {
          toast({ 
            title: 'Lỗi', 
            description: `Bạn chỉ được đăng sản phẩm thuộc loại "${sellerPrimaryCategory}". Vui lòng chọn đúng loại sản phẩm.`,
            variant: 'destructive' 
          });
          return;
        }
      }

      const form = new FormData();
      form.append('name', addProductForm.name.trim());
      form.append('description', addProductForm.description.trim());
      if (addProductForm.shortDescription) form.append('shortDescription', addProductForm.shortDescription.trim());
      if (addProductForm.category) form.append('category', addProductForm.category);
      if (addProductForm.price) form.append('price', String(parseFloat(addProductForm.price)));
      if (addProductForm.stock) form.append('stock', String(parseInt(addProductForm.stock)));
      form.append('status', addProductForm.status);
      form.append('sellerId', sellerId);
      // Thông tin kỹ thuật - gửi tất cả các trường để lưu vào DB
      form.append('weight', addProductForm.weight?.trim() || '');
      form.append('origin', addProductForm.origin?.trim() || '');
      form.append('expiryDate', addProductForm.expiryDate?.trim() || '');
      form.append('storageInstructions', addProductForm.storage?.trim() || ''); // Backend dùng storageInstructions
      form.append('unit', addProductForm.unit?.trim() || '');
      // dimensions, ingredients, brand được lưu trong specifications
      // Tạo specifications JSON string
      const specs: any = {};
      if (addProductForm.dimensions?.trim()) specs['Kích thước'] = addProductForm.dimensions.trim();
      if (addProductForm.ingredients?.trim()) specs['Thành phần'] = addProductForm.ingredients.trim();
      if (addProductForm.brand?.trim()) specs['Thương hiệu'] = addProductForm.brand.trim();
      if (Object.keys(specs).length > 0) {
        form.append('specifications', JSON.stringify(specs));
      }
      // Append images
      productImages.forEach((file) => form.append('images', file));
      detailImages.forEach((file) => form.append('detailImages', file));

      const resp = await fetch(`${API_BASE_URL}/api/products/upload`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : undefined,
        body: form
      });

      const result = await resp.json();
      if (!resp.ok) throw new Error(result?.error || 'Tạo sản phẩm thất bại');

      toast({ title: 'Thành công', description: 'Đã thêm sản phẩm mới' });
      setShowAddProduct(false);
      resetAddProductState();
      await loadProducts();
    } catch (e: any) {
      toast({ title: 'Lỗi', description: e?.message || 'Không thể thêm sản phẩm', variant: 'destructive' });
    } finally {
      setAddingProduct(false);
    }
  };

  return (
    <SellerGuard>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 py-8">
          <div className="container mx-auto px-4 max-w-7xl">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2">Trang Chủ Người Bán</h1>
              <p className="text-muted-foreground">Quản lý cửa hàng và đơn hàng của bạn</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Tổng đơn hàng</p>
                      <p className="text-2xl font-bold">{stats.totalOrders}</p>
                      <div className="flex items-center mt-2">
                        <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                        <span className="text-sm text-green-500">+12% so với tháng trước</span>
                      </div>
                    </div>
                    <ShoppingBag className="h-12 w-12 text-primary" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Đang chờ xử lý</p>
                      <p className="text-2xl font-bold">{stats.pendingOrders}</p>
                      <div className="flex items-center mt-2">
                        <Clock className="h-4 w-4 text-orange-500 mr-1" />
                        <span className="text-sm text-orange-500">Cần xử lý ngay</span>
                      </div>
                    </div>
                    <AlertCircle className="h-12 w-12 text-orange-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Tổng doanh thu (đã trừ phí)</p>
                      <p className="text-2xl font-bold">{formatCurrency(netTotalRevenue)}</p>
                      <div className="flex items-center mt-2 text-sm text-muted-foreground">
                        Nhận 85% từ {formatCurrency(stats.totalRevenue)}
                      </div>
                    </div>
                    <TrendingUp className="h-12 w-12 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Sản phẩm</p>
                      <p className="text-2xl font-bold">{activeProductCount}/{totalProductCount}</p>
                      <div className="flex items-center mt-2">
                        <Package className="h-4 w-4 text-blue-500 mr-1" />
                        <span className="text-sm text-blue-500">
                          {totalProductCount > 0
                            ? `${activeProductCount} sản phẩm đang mở bán`
                            : "Chưa có sản phẩm"}
                        </span>
                      </div>
                    </div>
                    <Package className="h-12 w-12 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Content Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-8 h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground">
                <TabsTrigger value="overview">Tổng quan</TabsTrigger>
                <TabsTrigger value="analytics">Phân tích</TabsTrigger>
                <TabsTrigger value="products" className="relative">
                  Sản phẩm
                  {renderTabBadge(products.length)}
                </TabsTrigger>
                <TabsTrigger value="flashsale" className="relative">
                  Flash Sale
                  {renderTabBadge(flashSales.length)}
                </TabsTrigger>
                <TabsTrigger value="orders" className="relative">
                  Đơn hàng
                  {(() => {
                    const ordersNeedingAction = orders.filter((order: any) => {
                      const status = String(order.status || '').toLowerCase();
                      return status === 'pending' || status === 'processing' || status === 'confirmed';
                    }).length;
                    const badgeCount = ordersNeedingAction > 0 ? ordersNeedingAction : stats.totalOrders || 0;
                    return renderTabBadge(badgeCount);
                  })()}
                </TabsTrigger>
                <TabsTrigger value="notifications" className="relative">
                  Thông báo
                  {(() => {
                    const unread = notificationsList.filter(n => n.read === false).length;
                    return renderTabBadge(unread);
                  })()}
                </TabsTrigger>
                <TabsTrigger value="messages" className="relative">
                  Tin nhắn
                  {renderTabBadge(unreadMessageCount)}
                </TabsTrigger>
                <TabsTrigger value="settings">Cài đặt</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6 mt-6">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Recent Orders */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Đơn hàng gần đây</CardTitle>
                      <CardDescription>5 đơn hàng mới nhất</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {orders.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <p>Chưa có đơn hàng nào</p>
                          </div>
                        ) : (
                          orders
                            .slice()
                            .sort((a: any, b: any) => {
                              // Sort by createdAt descending (newest first)
                              const dateA = new Date(a.createdAt || 0).getTime();
                              const dateB = new Date(b.createdAt || 0).getTime();
                              return dateB - dateA;
                            })
                            .slice(0, 5)
                            .map((order: any, index: number) => {
                              // Get order total price
                              const orderTotal = order.totalPrice ?? order.totalAmount ?? 0;
                              
                              // Get product names from order items
                              const productNames = order.items && order.items.length > 0
                                ? order.items
                                    .slice(0, 2) // Show max 2 products
                                    .map((item: any) => item.nameSnapshot || item.name || 'Sản phẩm')
                                    .join(', ')
                                : 'Không có sản phẩm';
                              
                              const moreProductsCount = order.items && order.items.length > 2
                                ? order.items.length - 2
                                : 0;
                              
                              // Format order date
                              const orderDate = order.createdAt 
                                ? formatDate(order.createdAt)
                                : 'Chưa có ngày';
                              
                              return (
                                <div key={order.id || index} className="flex items-start justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                                  <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-sm mb-1">
                                      Đơn hàng #{order.id?.slice(-6) || 'N/A'}
                                    </p>
                                    <p className="text-sm text-muted-foreground mb-1 line-clamp-1">
                                      {productNames}
                                      {moreProductsCount > 0 && ` và ${moreProductsCount} sản phẩm khác`}
                                    </p>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                      <span className="font-semibold text-primary">
                                        {formatCurrency(orderTotal)}
                                      </span>
                                      <span>•</span>
                                      <span>{orderDate}</span>
                                    </div>
                                  </div>
                                  <div className="ml-3 flex-shrink-0">
                                    {getOrderStatusBadge(order.status)}
                                  </div>
                                </div>
                              );
                            })
                        )}
                      </div>
                      <Button variant="outline" className="w-full mt-4" onClick={() => setActiveTab('orders')}>
                        Xem tất cả đơn hàng
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Sales Chart */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>Biểu đồ doanh thu</CardTitle>
                        <Select value={revenueChartPeriod} onValueChange={(value: "7" | "30" | "90" | "all") => setRevenueChartPeriod(value)}>
                          <SelectTrigger className="w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="7">7 ngày qua</SelectItem>
                            <SelectItem value="30">30 ngày qua</SelectItem>
                            <SelectItem value="90">90 ngày qua</SelectItem>
                            <SelectItem value="all">Tất cả</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <CardDescription>
                        {revenueChartPeriod === "7" && "7 ngày qua"}
                        {revenueChartPeriod === "30" && "30 ngày qua"}
                        {revenueChartPeriod === "90" && "90 ngày qua"}
                        {revenueChartPeriod === "all" && "Tất cả thời gian"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {revenueChartData.length > 0 ? (
                        <div className="h-64 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={revenueChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                              <XAxis 
                                dataKey="date" 
                                stroke="#6b7280"
                                style={{ fontSize: '12px' }}
                              />
                              <YAxis 
                                stroke="#6b7280"
                                style={{ fontSize: '12px' }}
                                tickFormatter={(value) => {
                                  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                                  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                                  return value.toString();
                                }}
                              />
                              <Tooltip 
                                content={({ active, payload }) => {
                                  if (active && payload && payload.length) {
                                    const data = payload[0].payload;
                                    return (
                                      <div className="bg-white p-3 border rounded-lg shadow-lg">
                                        <p className="font-semibold text-sm mb-1">{data.fullDate}</p>
                                        <p className="text-sm text-gray-600">
                                          Doanh thu: <span className="font-semibold text-green-600">
                                            {data.revenue.toLocaleString('vi-VN')}đ
                                          </span>
                                        </p>
                                        <p className="text-sm text-gray-600">
                                          Nhận được: <span className="font-semibold text-blue-600">
                                            {data.netRevenue.toLocaleString('vi-VN')}đ
                                          </span>
                                        </p>
                                        <p className="text-sm text-gray-600">
                                          Số đơn: <span className="font-semibold">{data.orders}</span>
                                        </p>
                                      </div>
                                    );
                                  }
                                  return null;
                                }}
                              />
                              <Legend />
                              <Line 
                                type="monotone" 
                                dataKey="revenue" 
                                stroke="#10b981" 
                                strokeWidth={2}
                                name="Doanh thu"
                                dot={{ r: 4 }}
                                activeDot={{ r: 6 }}
                              />
                              <Line 
                                type="monotone" 
                                dataKey="netRevenue" 
                                stroke="#3b82f6" 
                                strokeWidth={2}
                                name="Nhận được (85%)"
                                dot={{ r: 4 }}
                                activeDot={{ r: 6 }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="h-64 flex items-center justify-center text-muted-foreground">
                          <div className="text-center">
                            <BarChart3 className="h-16 w-16 mx-auto mb-4" />
                            <p>Chưa có dữ liệu</p>
                            <p className="text-sm">Không có đơn hàng trong khoảng thời gian này</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Quick Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle>Thao tác nhanh</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 pt-0">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <Button variant="outline" className="flex-col h-24" onClick={handleAddProductOpen}>
                        <Plus className="h-6 w-6 mb-2" />
                        Thêm sản phẩm
                      </Button>
                      <Button variant="outline" className="flex-col h-24" onClick={handleProcessOrders}>
                        <Package className="h-6 w-6 mb-2" />
                        Xử lý đơn hàng
                      </Button>
                      <Button variant="outline" className="flex-col h-24" onClick={handleExportProducts}>
                        <Download className="h-6 w-6 mb-2" />
                        Xuất báo cáo
                      </Button>
                      <Button variant="outline" className="flex-col h-24" onClick={handleOpenSettings}>
                        <Settings className="h-6 w-6 mb-2" />
                        Cài đặt
                      </Button>
                    </div>
                  </CardContent>
                </Card>

              </TabsContent>

              {/* Products Tab */}
              <TabsContent value="products" className="space-y-6 mt-6">
                <div className="flex justify-between items-center">
                  <div className="flex gap-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input placeholder="Tìm kiếm sản phẩm..." className="pl-10 w-64" />
                    </div>
                    <Button variant="outline">
                      <Filter className="h-4 w-4 mr-2" />
                      Lọc
                    </Button>
                  </div>
                  <Button onClick={handleAddProductOpen}>
                    <Plus className="h-4 w-4 mr-2" />
                    Thêm sản phẩm mới
                  </Button>
                </div>

                <Card>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sản phẩm</TableHead>
                        <TableHead>Giá</TableHead>
                        <TableHead>Tồn kho</TableHead>
                        <TableHead>Đã bán</TableHead>
                        <TableHead>Trạng thái</TableHead>
                        <TableHead>Thao tác</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map((product: any, index: number) => (
                        <TableRow key={index}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <img
                                src={product.images?.[0] || '/placeholder.svg'}
                                alt={product.name}
                                className="w-12 h-12 rounded object-cover"
                              />
                              <div>
                                <p className="font-semibold">{product.name}</p>
                                <p className="text-sm text-muted-foreground">SKU: {product.id?.slice(-8)}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{formatCurrency(product.price || 0)}</TableCell>
                          <TableCell>{product.stock || 0}</TableCell>
                          <TableCell>{product.soldCount || 0}</TableCell>
                          <TableCell>
                            <Badge variant={product.status === 'active' ? 'default' : 'secondary'}>
                              {product.status === 'active' ? 'Hoạt động' : 'Đã ẩn'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button variant="ghost" size="sm" onClick={() => handleEditProduct(product)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleViewProduct(product)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDeleteProduct(product)}>
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              </TabsContent>

              {/* Orders Tab */}
              <TabsContent value="orders" className="space-y-6 mt-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold text-foreground">Quản lý đơn hàng</h2>
                    <p className="text-muted-foreground">Theo dõi và quản lý tất cả đơn hàng</p>
                    <div className="mt-2 text-sm text-muted-foreground">
                      <p><strong>Quy trình duyệt đơn hàng:</strong></p>
                      <p>1. <span className="text-orange-600">Chờ duyệt</span> → 2. <span className="text-blue-600">Đã xác nhận</span> → 3. <span className="text-purple-600">Đã đóng gói</span> → 4. <span className="text-green-600">Đang giao</span> → 5. <span className="text-green-800">Đã giao</span></p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={loadOrders}>
                      <Package className="h-4 w-4 mr-2" />
                      Tải lại
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        const pendingOrders = orders.filter(order => order.status === 'pending' || order.status === 'processing');
                        if (pendingOrders.length > 0) {
                          toast({
                            title: "Đơn hàng chờ duyệt",
                            description: `Có ${pendingOrders.length} đơn hàng đang chờ xử lý`,
                          });
                        } else {
                          toast({
                            title: "Không có đơn hàng chờ duyệt",
                            description: "Tất cả đơn hàng đã được xử lý",
                          });
                        }
                      }}
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      Kiểm tra đơn chờ
                    </Button>
                  </div>
                </div>

                {/* Order Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Chờ duyệt</p>
                          <p className="text-2xl font-bold text-orange-600">
                            {orders.filter(order => order.status === 'pending' || order.status === 'processing').length}
                          </p>
                        </div>
                        <Clock className="h-8 w-8 text-orange-500" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Đang xử lý</p>
                          <p className="text-2xl font-bold text-blue-600">
                            {orders.filter(order => order.status === 'confirmed' || order.status === 'packed').length}
                          </p>
                        </div>
                        <Package className="h-8 w-8 text-blue-500" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Đang giao</p>
                          <p className="text-2xl font-bold text-purple-600">
                            {orders.filter(order => order.status === 'shipping').length}
                          </p>
                        </div>
                        <Truck className="h-8 w-8 text-purple-500" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Hoàn thành</p>
                          <p className="text-2xl font-bold text-green-600">
                            {orders.filter(order => order.status === 'delivered').length}
                          </p>
                        </div>
                        <CheckCircle className="h-8 w-8 text-green-500" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Order Filter */}
                <div className="flex gap-4 items-center">
                  <div className="flex gap-2">
                    <Button
                      variant={orderFilter === 'all' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setOrderFilter('all')}
                    >
                      Tất cả ({orders.length})
                    </Button>
                    <Button
                      variant={orderFilter === 'pending' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setOrderFilter('pending')}
                      className="text-orange-600 border-orange-200"
                    >
                      Chờ duyệt ({orders.filter(order => order.status === 'pending' || order.status === 'processing').length})
                    </Button>
                    <Button
                      variant={orderFilter === 'processing' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setOrderFilter('processing')}
                      className="text-blue-600 border-blue-200"
                    >
                      Đang xử lý ({orders.filter(order => order.status === 'confirmed' || order.status === 'packed').length})
                    </Button>
                    <Button
                      variant={orderFilter === 'shipping' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setOrderFilter('shipping')}
                      className="text-purple-600 border-purple-200"
                    >
                      Đang giao ({orders.filter(order => order.status === 'shipping').length})
                    </Button>
                    <Button
                      variant={orderFilter === 'delivered' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setOrderFilter('delivered')}
                      className="text-green-600 border-green-200"
                    >
                      Hoàn thành ({orders.filter(order => order.status === 'delivered').length})
                    </Button>
                  </div>
                </div>

                <Card>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mã đơn</TableHead>
                        <TableHead>Khách hàng</TableHead>
                        <TableHead>Sản phẩm</TableHead>
                        <TableHead>Tổng tiền</TableHead>
                        <TableHead>Trạng thái</TableHead>
                        <TableHead>Ngày đặt</TableHead>
                        <TableHead>Thao tác</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoadingOrders ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8">Đang tải...</TableCell>
                        </TableRow>
                      ) : orders.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Không có đơn hàng</TableCell>
                        </TableRow>
                      ) : (
                        orders
                          .filter(order => {
                            if (orderFilter === 'all') return true;
                            if (orderFilter === 'pending') return order.status === 'pending' || order.status === 'processing';
                            if (orderFilter === 'processing') return order.status === 'confirmed' || order.status === 'packed';
                            if (orderFilter === 'shipping') return order.status === 'shipping';
                            if (orderFilter === 'delivered') return order.status === 'delivered';
                            return true;
                          })
                          .sort((a: any, b: any) => {
                            // Sort by createdAt descending (newest first)
                            const dateA = new Date(a.createdAt || 0).getTime();
                            const dateB = new Date(b.createdAt || 0).getTime();
                            return dateB - dateA;
                          })
                          .map((order: any) => (
                            <TableRow key={order.id}>
                              <TableCell className="font-medium">{order.id}</TableCell>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{customerNames[order.userId] || order.userId}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {order.shippingAddress ?
                                      `${order.shippingAddress.address}, ${order.shippingAddress.city}` :
                                      'Chưa có địa chỉ'
                                    }
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="max-w-xs">
                                  {order.items && order.items.length > 0 ? (
                                    <div className="space-y-1">
                                      {order.items.slice(0, 2).map((item: any, index: number) => (
                                        <div key={index} className="text-sm">
                                          <span className="font-medium">{item.productName || item.name || productNames[item.productId] || 'Tên sản phẩm không xác định'}</span>
                                          <span className="text-muted-foreground"> x{item.quantity}</span>
                                        </div>
                                      ))}
                                      {order.items.length > 2 && (
                                        <p className="text-xs text-muted-foreground">
                                          +{order.items.length - 2} sản phẩm khác
                                        </p>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground">Không có sản phẩm</span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="font-medium">₫{order.totalPrice?.toLocaleString() || order.totalAmount?.toLocaleString() || 0}</TableCell>
                              <TableCell>{getOrderStatusBadge(order.status)}</TableCell>
                              <TableCell>{new Date(order.createdAt || 0).toLocaleString('vi-VN')}</TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  {/* Xem chi tiết - luôn có */}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    title="Xem chi tiết đơn hàng"
                                    onClick={() => {
                                      toast({
                                        title: "Chi tiết đơn hàng",
                                        description: `Đơn hàng #${order.id} - ${order.items?.length || 0} sản phẩm`,
                                      });
                                    }}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>

                                  {/* Nút hành động chính dựa trên trạng thái */}
                                  {(order.status === 'pending' || order.status === 'processing') && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-green-600 border-green-200 hover:bg-green-50"
                                      onClick={() => doOrderAction(order.id, 'confirm')}
                                      title="Duyệt đơn hàng"
                                      disabled={loadingOrderId === order.id}
                                    >
                                      {loadingOrderId === order.id ? (
                                        <Clock className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <CheckCircle className="h-4 w-4" />
                                      )}
                                    </Button>
                                  )}

                                  {order.status === 'confirmed' && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-blue-600 border-blue-200 hover:bg-blue-50"
                                      onClick={() => doOrderAction(order.id, 'pack')}
                                      title="Đóng gói sản phẩm"
                                      disabled={loadingOrderId === order.id}
                                    >
                                      {loadingOrderId === order.id ? (
                                        <Clock className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <Package className="h-4 w-4" />
                                      )}
                                    </Button>
                                  )}

                                  {/* Nút "Đang giao hàng" chỉ hiển thị khi đơn đã đóng gói */}
                                  {order.status === 'packed' && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-green-600 border-green-200 hover:bg-green-50"
                                      onClick={() => doOrderAction(order.id, 'handover')}
                                      title="Bắt đầu giao hàng"
                                      disabled={loadingOrderId === order.id}
                                    >
                                      {loadingOrderId === order.id ? (
                                        <Clock className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <Truck className="h-4 w-4 mr-1" />
                                      )}
                                      Đang giao hàng
                                    </Button>
                                  )}

                                  {order.status === 'shipping' && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-green-600 border-green-200 hover:bg-green-50"
                                      onClick={() => doOrderAction(order.id, 'deliver')}
                                      title="Xác nhận giao thành công"
                                      disabled={loadingOrderId === order.id}
                                    >
                                      {loadingOrderId === order.id ? (
                                        <Clock className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <CheckCircle className="h-4 w-4" />
                                      )}
                                    </Button>
                                  )}

                                  {/* Nút hủy - chỉ khi có thể hủy */}
                                  {(order.status === 'pending' || order.status === 'confirmed' || order.status === 'processing') && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-red-600 border-red-200 hover:bg-red-50"
                                      onClick={() => {
                                        if (confirm('Bạn có chắc chắn muốn hủy đơn hàng này?')) {
                                          doOrderAction(order.id, 'cancel');
                                        }
                                      }}
                                      title="Hủy đơn hàng"
                                      disabled={loadingOrderId === order.id}
                                    >
                                      {loadingOrderId === order.id ? (
                                        <Clock className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <X className="h-4 w-4" />
                                      )}
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                      )}
                    </TableBody>
                  </Table>
                </Card>
              </TabsContent>

              {/* Analytics Tab */}
              <TabsContent value="analytics" className="space-y-6 mt-6">
                <Card>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-4 items-end">
                      <div className="space-y-2">
                        <Label>Khoảng thời gian</Label>
                        <Select value={analyticsRange} onValueChange={setAnalyticsRange}>
                          <SelectTrigger className="min-w-[180px]">
                            <SelectValue placeholder="Chọn khoảng thời gian" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="7">7 ngày gần đây</SelectItem>
                            <SelectItem value="30">30 ngày gần đây</SelectItem>
                            <SelectItem value="90">90 ngày gần đây</SelectItem>
                            <SelectItem value="all">Toàn bộ</SelectItem>
                            <SelectItem value="custom">Tùy chọn</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {analyticsRange === "custom" && (
                        <div className="flex flex-wrap gap-4">
                          <div className="space-y-2">
                            <Label>Từ ngày</Label>
                            <Input
                              type="date"
                              value={customAnalyticsRange.start}
                              onChange={(e) =>
                                setCustomAnalyticsRange((prev) => ({ ...prev, start: e.target.value }))
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Đến ngày</Label>
                            <Input
                              type="date"
                              value={customAnalyticsRange.end}
                              onChange={(e) =>
                                setCustomAnalyticsRange((prev) => ({ ...prev, end: e.target.value }))
                              }
                            />
                          </div>
                        </div>
                      )}
                      <div className="flex-1 text-sm text-muted-foreground">
                        Đang hiển thị {analyticsOrdersCount} đơn hàng • {bestSellingProducts.length} sản phẩm nổi bật
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid md:grid-cols-3 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Đánh giá trung bình</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-4xl font-bold mb-2">{stats.rating.toFixed(1)}</div>
                          <div className="flex items-center justify-center">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`h-5 w-5 ${star <= Math.floor(stats.rating) ? "text-yellow-400 fill-yellow-400" : "text-gray-300"
                                  }`}
                              />
                            ))}
                          </div>
                          <p className="text-sm text-muted-foreground mt-2">
                            Dựa trên {stats.reviewCount || 0} đánh giá
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Doanh thu theo bộ lọc</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center space-y-2">
                      <div className="text-3xl font-bold text-green-600">
                        {formatCurrency(netAnalyticsRevenue)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Nhận 85% từ {formatCurrency(analyticsRevenue)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {analyticsOrdersCount} đơn • Giá trị TB {formatCurrency(netAnalyticsAverageOrderValue || 0)}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Hiệu suất đơn hàng</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground text-sm">Hoàn tất</span>
                        <span className="font-semibold">{analyticsCompletedOrders}/{analyticsOrdersCount}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{ width: `${Math.min(analyticsCompletionRate, 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Tỷ lệ hoàn tất {analyticsCompletionRate.toFixed(1)}%
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Sản phẩm bán chạy</CardTitle>
                    <CardDescription>
                      Top sản phẩm có số lượng bán cao nhất trong khoảng thời gian đã chọn
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {bestSellingProducts.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        Chưa có dữ liệu trong khoảng thời gian này.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {bestSellingProducts.map((item, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{item.name}</p>
                              <p className="text-xs text-muted-foreground">Top {index + 1}</p>
                            </div>
                            <Badge variant="outline">{item.quantity} đã bán</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Settings Tab */}
              <TabsContent value="settings" className="space-y-6 mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Cài đặt cửa hàng</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid gap-4">
                      <Label htmlFor="store-name">Tên cửa hàng</Label>
                      <Input 
                        id="store-name" 
                        placeholder="Tên cửa hàng của bạn"
                        value={shopSettings.businessName}
                        onChange={(e) => setShopSettings(prev => ({ ...prev, businessName: e.target.value }))}
                      />
                    </div>
                    <div className="grid gap-4">
                      <Label htmlFor="store-description">Mô tả cửa hàng</Label>
                      <Textarea 
                        id="store-description" 
                        placeholder="Mô tả về cửa hàng của bạn"
                        value={shopSettings.description}
                        onChange={(e) => setShopSettings(prev => ({ ...prev, description: e.target.value }))}
                        rows={4}
                      />
                    </div>
                    <div className="grid gap-4">
                      <Label htmlFor="store-contact">Liên hệ</Label>
                      <Input 
                        id="store-contact" 
                        placeholder="Email hoặc số điện thoại"
                        value={shopSettings.contact}
                        onChange={(e) => setShopSettings(prev => ({ ...prev, contact: e.target.value }))}
                      />
                    </div>
                    <div className="grid gap-4">
                      <Label htmlFor="shipping-address">Địa chỉ giao hàng</Label>
                      <Textarea 
                        id="shipping-address" 
                        placeholder="Ví dụ: Phường Cổ Nhuế 1, Quận Bắc Từ Liêm, Thành phố Hà Nội"
                        value={shopSettings.shippingAddress}
                        onChange={(e) => setShopSettings(prev => ({ ...prev, shippingAddress: e.target.value }))}
                        rows={3}
                      />
                      <p className="text-xs text-muted-foreground">
                        Nhập địa chỉ theo định dạng: Phường/Xã, Quận/Huyện, Tỉnh/Thành phố
                      </p>
                    </div>
                    <Button 
                      onClick={handleSaveShopSettings}
                      disabled={isSavingSettings}
                    >
                      {isSavingSettings ? "Đang lưu..." : "Lưu thay đổi"}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Notifications Tab */}
              <TabsContent value="notifications">
                <div className="space-y-4">
                  {notificationsList.length === 0 ? (
                    <p className="text-center text-muted-foreground">Chưa có thông báo nào.</p>
                  ) : (
                    notificationsList.map(notif => (
                      <Card key={notif.id} className="flex items-start gap-3 bg-muted/20 border relative p-4">
                        <div>
                          {notif.type === "ORDER" && <Package className="text-blue-500" />}
                          {notif.type === "INVENTORY" && <AlertCircle className="text-orange-500" />}
                          {notif.type === "SYSTEM" && <Shield className="text-gray-500" />}
                          {notif.type === "REVIEW" && <Star className="text-yellow-500" />}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">{notif.title}</div>
                          <div className="text-sm text-muted-foreground">{notif.message}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {new Date(notif.createdAt).toLocaleString("vi-VN")}
                          </div>
                        </div>
                        {!notif.read && (
                          <Badge variant="destructive" className="absolute top-2 right-2">Mới</Badge>
                        )}
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>

              {/* Messages Tab */}
              <TabsContent value="messages" className="space-y-6 mt-6">
                <Card className="border-primary/10">
                  <CardHeader>
                    <CardTitle>Trung tâm tin nhắn</CardTitle>
                    <CardDescription>Trả lời nhanh câu hỏi từ khách hàng</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col lg:flex-row gap-4">
                      <div className="lg:w-2/5 space-y-3 max-h-[420px] overflow-auto">
                        {conversations.length === 0 ? (
                          <div className="text-center text-muted-foreground py-12 border rounded-2xl">
                            Chưa có cuộc trò chuyện nào.
                          </div>
                        ) : (
                          conversations.map((conversation) => {
                            const lastMessage = getLastMessage(conversation);
                            const isActive = activeConversation?.id === conversation.id;
                            const unread = isConversationUnread(conversation);
                            return (
                              <button
                                key={conversation.id}
                                className={`w-full text-left p-4 rounded-2xl border transition ${isActive
                                    ? "border-primary bg-primary/5 shadow-sm"
                                    : "border-muted hover:border-primary/40"
                                  }`}
                                onClick={() => handleSelectConversation(conversation.id)}
                              >
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-10 w-10">
                                    <AvatarFallback>
                                      {getConversationDisplayName(conversation).charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-center gap-2">
                                      <p className="font-semibold truncate">
                                        {getConversationDisplayName(conversation)}
                                      </p>
                                      <span className="text-xs text-muted-foreground">
                                        {formatMessageTimestamp(lastMessage?.timestamp || conversation.updatedAt)}
                                      </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground truncate">
                                      {conversation.orderId ? `Đơn ${conversation.orderId}` : "Không có mã đơn"}
                                    </p>
                                    <p className="text-sm text-foreground mt-1 truncate">
                                      {lastMessage
                                        ? `${lastMessage.role === "seller" ? "Bạn: " : ""}${lastMessage.content}`
                                        : "Chưa có tin nhắn"}
                                    </p>
                                  </div>
                                </div>
                                {unread && (
                                  <Badge className="mt-2 bg-green-600 text-white">Chưa đọc</Badge>
                                )}
                              </button>
                            );
                          })
                        )}
                      </div>

                      <div className="lg:flex-1 border rounded-2xl p-4 space-y-4 min-h-[420px]">
                        {activeConversation ? (
                          <>
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-semibold text-lg">
                                  {getConversationDisplayName(activeConversation)}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {activeConversation.orderId ? `Đơn ${activeConversation.orderId}` : "Không có mã đơn"}
                                </p>
                              </div>
                              <Badge variant="outline" className="flex items-center gap-1">
                                <MessageCircle className="h-3 w-3" />
                                Real-time
                              </Badge>
                            </div>
                            <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                              {(activeConversation.messages ?? []).length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-6">
                                  Chưa có tin nhắn nào trong hội thoại này.
                                </p>
                              ) : (
                                activeConversation.messages!.map((message, idx) => (
                                  <div
                                    key={`${message.timestamp}-${idx}`}
                                    className={`flex ${message.role === "seller" ? "justify-end" : "justify-start"}`}
                                  >
                                    <div
                                      className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${message.role === "seller"
                                          ? "bg-primary text-primary-foreground rounded-br-none"
                                          : "bg-muted text-foreground rounded-bl-none"
                                        }`}
                                    >
                                      <p>{message.content}</p>
                                      <span className="block text-[11px] text-muted-foreground/80 mt-1">
                                        {formatMessageTimestamp(message.timestamp)}
                                      </span>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                            <div className="space-y-2">
                              <Textarea
                                placeholder="Nhập tin nhắn..."
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage();
                                  }
                                }}
                                className="min-h-[40px]"
                              />
                              <div className="flex justify-end">
                                <Button onClick={handleSendMessage} disabled={isSendingMessage || !chatInput.trim()}>
                                  {isSendingMessage ? (
                                    <>
                                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                                      Đang gửi...
                                    </>
                                  ) : (
                                    <>
                                      <Send className="h-4 w-4 mr-2" />
                                      Gửi
                                    </>
                                  )}
                                </Button>
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground">
                            <MessageCircle className="h-10 w-10 mb-3" />
                            <p>Chọn một cuộc trò chuyện để xem và phản hồi.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Flash Sale Tab */}
              <TabsContent value="flashsale" className="space-y-6 mt-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Zap className="h-5 w-5 text-orange-500" />
                          Quản lý Flash Sale
                        </CardTitle>
                        <CardDescription>
                          Thêm sản phẩm của bạn vào các chương trình flash sale đang diễn ra
                        </CardDescription>
                      </div>
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
                        <p className="text-muted-foreground">
                          Hiện tại không có flash sale nào đang diễn ra hoặc sắp diễn ra
                        </p>
                        <p className="text-sm text-muted-foreground mt-2">
                          Vui lòng liên hệ quản trị viên để tạo flash sale mới
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {flashSales.map((flashSale) => {
                          const now = new Date();
                          const startTime = new Date(flashSale.startTime);
                          const endTime = new Date(flashSale.endTime);
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
                                          {new Date(flashSale.startTime).toLocaleString('vi-VN')} - {new Date(flashSale.endTime).toLocaleString('vi-VN')}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <Package className="h-4 w-4" />
                                        <span>{flashSale.products?.length || 0} sản phẩm</span>
                                      </div>
                                    </div>
                                  </div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedFlashSale(flashSale);
                                      setShowAddProductToFlashSale(true);
                                    }}
                                  >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Thêm sản phẩm
                                  </Button>
                                </div>
                              </CardHeader>
                              <CardContent>
                                <div className="mb-4">
                                  <h4 className="font-medium mb-2">Sản phẩm của bạn trong flash sale này:</h4>
                                  {flashSale.products && flashSale.products.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                      {flashSale.products
                                        .filter(product => {
                                          const sellerProduct = products.find((p: any) => p.id === product.productId);
                                          return sellerProduct !== undefined;
                                        })
                                        .map((product) => {
                                          const sellerProduct = products.find((p: any) => p.id === product.productId);
                                          if (!sellerProduct) return null;
                                          
                                          return (
                                            <Card key={product.productId} className="border-2 border-primary">
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
                                                      <span className="text-red-500 font-bold">
                                                        ₫{product.flashSalePrice.toLocaleString()}
                                                      </span>
                                                      <span className="text-xs text-muted-foreground line-through">
                                                        ₫{product.originalPrice.toLocaleString()}
                                                      </span>
                                                      <Badge variant="destructive" className="text-xs">
                                                        -{Math.round(product.discountPercentage || 0)}%
                                                      </Badge>
                                                    </div>
                                                    <div className="text-xs text-muted-foreground mb-2">
                                                      Kho FS: {product.flashSaleStock} | Đã bán: {product.soldCount} | Max/người: {product.maxQuantityPerUser}
                                                    </div>
                                                    <div className="flex gap-2">
                                                      <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="flex-1 text-xs"
                                        onClick={() => {
                                          setEditingProductInFlashSale({
                                            flashSaleId: flashSale.id,
                                            product
                                          });
                                          setSelectedFlashSale(flashSale);
                                          setProductFlashSaleForm({
                                            productId: product.productId,
                                            flashSalePrice: product.flashSalePrice,
                                            flashSaleStock: product.flashSaleStock,
                                            maxQuantityPerUser: product.maxQuantityPerUser
                                          });
                                          setShowAddProductToFlashSale(true);
                                        }}
                                                      >
                                                        <Edit className="h-3 w-3 mr-1" />
                                                        Sửa
                                                      </Button>
                                                      <Button
                                                        variant="destructive"
                                                        size="sm"
                                                        className="text-xs"
                                                        onClick={async () => {
                                                          if (confirm('Bạn có chắc muốn xóa sản phẩm này khỏi flash sale?')) {
                                                            try {
                                                              const updatedProducts = flashSale.products?.filter(p => p.productId !== product.productId) || [];
                                                              await fetch(`${API_BASE_URL}/api/flashsales/${flashSale.id}/products`, {
                                                                method: 'PUT',
                                                                headers: {
                                                                  'Content-Type': 'application/json',
                                                                  'Authorization': `Bearer ${token}`,
                                                                },
                                                                body: JSON.stringify(updatedProducts),
                                                              });
                                                              toast({
                                                                title: 'Thành công',
                                                                description: 'Đã xóa sản phẩm khỏi flash sale',
                                                              });
                                                              loadFlashSales();
                                                            } catch (error) {
                                                              toast({
                                                                title: 'Lỗi',
                                                                description: 'Không thể xóa sản phẩm',
                                                                variant: 'destructive',
                                                              });
                                                            }
                                                          }
                                                        }}
                                                      >
                                                        <Trash2 className="h-3 w-3" />
                                                      </Button>
                                                    </div>
                                                  </div>
                                                </div>
                                              </CardContent>
                                            </Card>
                                          );
                                        })}
                                    </div>
                                  ) : (
                                    <p className="text-muted-foreground text-center py-4">Bạn chưa có sản phẩm nào trong flash sale này</p>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
        <Footer />
      </div>

      {/* Add Product Dialog */}
      <Dialog open={showAddProduct} onOpenChange={handleAddProductDialogChange}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{isEditMode ? 'Cập nhật sản phẩm' : 'Thêm sản phẩm'}</DialogTitle>
            <DialogDescription>
              {isEditMode ? 'Chỉnh sửa thông tin sản phẩm của bạn. Để thay đổi hình ảnh, hãy tải lên ảnh mới (tùy chọn).' : 'Nhập thông tin cơ bản để tạo sản phẩm mới'}
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 pr-2">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Cột trái */}
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="ap-name">Tên sản phẩm</Label>
                  <Input id="ap-name" value={addProductForm.name} onChange={e => setAddProductForm(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="ap-short">Mô tả ngắn</Label>
                  <Input id="ap-short" value={addProductForm.shortDescription} onChange={e => setAddProductForm(p => ({ ...p, shortDescription: e.target.value }))} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="ap-desc">Mô tả</Label>
                  <Textarea id="ap-desc" rows={4} value={addProductForm.description} onChange={e => setAddProductForm(p => ({ ...p, description: e.target.value }))} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="ap-category">Danh mục</Label>
                  <select
                    id="ap-category"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    value={addProductForm.category}
                    onChange={(e) => setAddProductForm(p => ({ ...p, category: e.target.value }))}
                    required
                  >
                    <option value="">Chọn danh mục</option>
                    {categoryOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  {sellerPrimaryCategory && categoryOptions.length === 1 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Bạn chỉ có thể đăng sản phẩm thuộc loại này do đã đăng ký khi tạo tài khoản bán hàng.
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="ap-price">Giá</Label>
                    <Input id="ap-price" type="number" min="0" value={addProductForm.price} onChange={e => setAddProductForm(p => ({ ...p, price: e.target.value }))} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="ap-stock">Tồn kho</Label>
                    <Input id="ap-stock" type="number" min="0" value={addProductForm.stock} onChange={e => setAddProductForm(p => ({ ...p, stock: e.target.value }))} />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Ảnh sản phẩm (ít nhất 1 ảnh)</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => setProductImages(e.target.files ? Array.from(e.target.files) : [])}
                  />
                  <div className="text-sm text-muted-foreground">
                    {isEditMode ? 'Để giữ nguyên ảnh hiện tại, bạn có thể bỏ qua mục này.' : 'Vui lòng chọn ít nhất 1 ảnh.'}
                  </div>
                  {productImages.length > 0 && (
                    <div className="text-sm text-muted-foreground">Đã chọn {productImages.length} ảnh mới</div>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label>Ảnh chi tiết (tuỳ chọn)</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => setDetailImages(e.target.files ? Array.from(e.target.files) : [])}
                  />
                  {detailImages.length > 0 && (
                    <div className="text-sm text-muted-foreground">Đã chọn {detailImages.length} ảnh chi tiết</div>
                  )}
                </div>
              </div>

              {/* Cột phải */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold mb-2">Thông tin kỹ thuật (Tùy chọn)</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="ap-weight">Trọng lượng</Label>
                      <Input 
                        id="ap-weight" 
                        placeholder="Ví dụ: 500g, 1kg" 
                        value={addProductForm.weight} 
                        onChange={e => setAddProductForm(p => ({ ...p, weight: e.target.value }))} 
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="ap-unit">Đơn vị</Label>
                      <Input 
                        id="ap-unit" 
                        placeholder="Ví dụ: kg, g, hộp" 
                        value={addProductForm.unit} 
                        onChange={e => setAddProductForm(p => ({ ...p, unit: e.target.value }))} 
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="ap-dimensions">Kích thước</Label>
                    <Input 
                      id="ap-dimensions" 
                      placeholder="Ví dụ: 20x15x10 cm" 
                      value={addProductForm.dimensions} 
                      onChange={e => setAddProductForm(p => ({ ...p, dimensions: e.target.value }))} 
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="ap-origin">Xuất xứ</Label>
                      <Input 
                        id="ap-origin" 
                        placeholder="Ví dụ: Việt Nam" 
                        value={addProductForm.origin} 
                        onChange={e => setAddProductForm(p => ({ ...p, origin: e.target.value }))} 
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="ap-brand">Thương hiệu</Label>
                      <Input 
                        id="ap-brand" 
                        placeholder="Tên thương hiệu" 
                        value={addProductForm.brand} 
                        onChange={e => setAddProductForm(p => ({ ...p, brand: e.target.value }))} 
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="ap-expiry">Hạn sử dụng</Label>
                    <Input 
                      id="ap-expiry" 
                      placeholder="Ví dụ: 30 ngày, 6 tháng" 
                      value={addProductForm.expiryDate} 
                      onChange={e => setAddProductForm(p => ({ ...p, expiryDate: e.target.value }))} 
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="ap-storage">Bảo quản</Label>
                    <Input 
                      id="ap-storage" 
                      placeholder="Ví dụ: Bảo quản nơi khô ráo, thoáng mát" 
                      value={addProductForm.storage} 
                      onChange={e => setAddProductForm(p => ({ ...p, storage: e.target.value }))} 
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="ap-ingredients">Thành phần</Label>
                    <Textarea 
                      id="ap-ingredients" 
                      rows={3}
                      placeholder="Liệt kê các thành phần chính" 
                      value={addProductForm.ingredients} 
                      onChange={e => setAddProductForm(p => ({ ...p, ingredients: e.target.value }))} 
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleAddProductDialogChange(false)} disabled={addingProduct}>Huỷ</Button>
            <Button onClick={handleSubmitAddProduct} disabled={addingProduct}>
              {addingProduct
                ? 'Đang lưu...'
                : isEditMode
                  ? 'Cập nhật sản phẩm'
                  : 'Thêm sản phẩm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Product Dialog */}
      <Dialog open={!!viewingProduct} onOpenChange={(open) => { if (!open) closeViewDialog(); }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Chi tiết sản phẩm</DialogTitle>
            <DialogDescription>Xem thông tin chi tiết của sản phẩm đã chọn</DialogDescription>
          </DialogHeader>
          {viewingProduct && (
            <div className="grid gap-6">
              <div>
                <h3 className="text-xl font-semibold mb-2">{viewingProduct.name}</h3>
                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                  <span>Danh mục: <strong>{viewingProduct.category || 'Chưa xác định'}</strong></span>
                  <span>Giá: <strong>{formatCurrency(viewingProduct.price || 0)}</strong></span>
                  <span>Tồn kho: <strong>{viewingProduct.stock ?? 0}</strong></span>
                  <span>Trạng thái: <strong>{viewingProduct.status || 'active'}</strong></span>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Mô tả</h4>
                  <p className="text-sm whitespace-pre-wrap">{viewingProduct.description || 'Không có mô tả'}</p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Mô tả ngắn</h4>
                  <p className="text-sm text-muted-foreground">{viewingProduct.shortDescription || 'Không có mô tả ngắn'}</p>
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">Hình ảnh</h4>
                {viewingProduct.images && viewingProduct.images.length > 0 ? (
                  <div className="flex flex-wrap gap-3">
                    {viewingProduct.images.map((img: string, idx: number) => (
                      <img key={idx} src={img} alt={`image-${idx}`} className="w-24 h-24 rounded object-cover border" />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Không có hình ảnh</p>
                )}
              </div>
              {viewingProduct.detailImages && viewingProduct.detailImages.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Hình ảnh chi tiết</h4>
                  <div className="flex flex-wrap gap-3">
                    {viewingProduct.detailImages.map((img: string, idx: number) => (
                      <img key={idx} src={img} alt={`detail-${idx}`} className="w-20 h-20 rounded object-cover border" />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={closeViewDialog}>Đóng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={(open) => { if (!open) closeDeleteDialog(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xóa sản phẩm</DialogTitle>
            <DialogDescription>Xác nhận xóa sản phẩm khỏi cửa hàng của bạn</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <p>Bạn có chắc chắn muốn xóa sản phẩm <strong>{deletingProduct?.name}</strong>?</p>
            <p className="text-sm text-muted-foreground">Thao tác này không thể hoàn tác.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDeleteDialog} disabled={deleting}>Huỷ</Button>
            <Button variant="destructive" onClick={confirmDeleteProduct} disabled={deleting}>
              {deleting ? 'Đang xóa...' : 'Xóa sản phẩm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Product in Flash Sale Dialog */}
      <Dialog open={showAddProductToFlashSale} onOpenChange={(open) => {
        setShowAddProductToFlashSale(open);
        if (!open) {
          setSelectedFlashSale(null);
          setEditingProductInFlashSale(null);
          setProductFlashSaleForm(null);
        }
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProductInFlashSale 
                ? 'Cập nhật sản phẩm trong Flash Sale' 
                : selectedFlashSale 
                  ? `Thêm sản phẩm vào: ${selectedFlashSale.name}` 
                  : 'Thêm sản phẩm vào Flash Sale'}
            </DialogTitle>
            <DialogDescription>
              {editingProductInFlashSale 
                ? 'Cập nhật thông tin sản phẩm của bạn trong flash sale này'
                : 'Chọn sản phẩm và thiết lập giá flash sale'}
            </DialogDescription>
          </DialogHeader>
          {selectedFlashSale && (
            <div className="space-y-4">
              <div className="bg-muted p-3 rounded-lg">
                <p className="text-sm font-medium mb-1">{selectedFlashSale.name}</p>
                <p className="text-xs text-muted-foreground">{selectedFlashSale.description}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Thời gian: {new Date(selectedFlashSale.startTime).toLocaleString('vi-VN')} - {new Date(selectedFlashSale.endTime).toLocaleString('vi-VN')}
                </p>
              </div>
              
              {editingProductInFlashSale ? (
                // Edit mode - show single product form
                (() => {
                  const product = products.find((p: any) => p.id === editingProductInFlashSale.product.productId);
                  if (!product) return <p className="text-muted-foreground">Không tìm thấy sản phẩm</p>;
                  
                  const form = productFlashSaleForm || {
                    productId: editingProductInFlashSale.product.productId,
                    flashSalePrice: editingProductInFlashSale.product.flashSalePrice,
                    flashSaleStock: editingProductInFlashSale.product.flashSaleStock,
                    maxQuantityPerUser: editingProductInFlashSale.product.maxQuantityPerUser
                  };
                  
                  return (
                    <div className="space-y-4">
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <img
                              src={product.images?.[0] || '/placeholder.svg'}
                              alt={product.name}
                              className="w-20 h-20 object-cover rounded"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = '/placeholder.svg';
                              }}
                            />
                            <div className="flex-1">
                              <h4 className="font-medium mb-2">{product.name}</h4>
                              <p className="text-sm text-muted-foreground mb-4">
                                Giá gốc: ₫{product.price?.toLocaleString() || 0} | Kho hiện có: {product.stock || 0}
                              </p>
                              <div className="grid grid-cols-3 gap-3">
                                <div>
                                  <Label className="text-xs">Giá Flash Sale *</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    value={form.flashSalePrice}
                                    onChange={(e) => setProductFlashSaleForm({
                                      ...form,
                                      flashSalePrice: parseFloat(e.target.value) || 0
                                    })}
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Số lượng Flash Sale *</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    max={product.stock || 0}
                                    value={form.flashSaleStock}
                                    onChange={(e) => setProductFlashSaleForm({
                                      ...form,
                                      flashSaleStock: Math.min(parseInt(e.target.value) || 0, product.stock || 0)
                                    })}
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">SL tối đa/người *</Label>
                                  <Input
                                    type="number"
                                    min="1"
                                    value={form.maxQuantityPerUser}
                                    onChange={(e) => setProductFlashSaleForm({
                                      ...form,
                                      maxQuantityPerUser: parseInt(e.target.value) || 1
                                    })}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  );
                })()
              ) : (
                // Add mode - show list of available products
                <div className="grid gap-2">
                  <Label>Chọn sản phẩm của bạn để thêm vào Flash Sale</Label>
                  <div className="border rounded-lg p-4 max-h-96 overflow-y-auto">
                    {products.length === 0 ? (
                      <p className="text-muted-foreground text-center py-4">
                        Bạn chưa có sản phẩm nào. Vui lòng thêm sản phẩm trước.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {products
                          .filter((product: any) => {
                            // Don't show products already in flash sale
                            return !selectedFlashSale.products?.some(p => p.productId === product.id);
                          })
                          .map((product: any) => {
                            const form = productFlashSaleForm?.productId === product.id 
                              ? productFlashSaleForm 
                              : {
                                  productId: product.id,
                                  flashSalePrice: product.price || 0,
                                  flashSaleStock: product.stock || 0,
                                  maxQuantityPerUser: 5
                                };
                            
                            return (
                              <Card 
                                key={product.id} 
                                className={productFlashSaleForm?.productId === product.id ? "border-primary" : ""}
                              >
                                <CardContent className="p-4">
                                  <div className="flex items-start gap-3">
                                    <input
                                      type="radio"
                                      name="selectedProduct"
                                      checked={productFlashSaleForm?.productId === product.id}
                                      onChange={() => setProductFlashSaleForm({
                                        productId: product.id,
                                        flashSalePrice: product.price || 0,
                                        flashSaleStock: product.stock || 0,
                                        maxQuantityPerUser: 5
                                      })}
                                      className="mt-1"
                                    />
                                    <img
                                      src={product.images?.[0] || '/placeholder.svg'}
                                      alt={product.name}
                                      className="w-16 h-16 object-cover rounded"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).src = '/placeholder.svg';
                                      }}
                                    />
                                    <div className="flex-1 min-w-0">
                                      <h4 className="font-medium text-sm mb-1">{product.name}</h4>
                                      <p className="text-xs text-muted-foreground mb-3">
                                        Giá gốc: ₫{product.price?.toLocaleString() || 0} | Kho: {product.stock || 0}
                                      </p>
                                      {productFlashSaleForm?.productId === product.id && (
                                        <div className="grid grid-cols-3 gap-2">
                                          <div>
                                            <Label className="text-xs">Giá Flash Sale *</Label>
                                            <Input
                                              type="number"
                                              min="0"
                                              value={form.flashSalePrice}
                                              onChange={(e) => setProductFlashSaleForm({
                                                ...form,
                                                flashSalePrice: parseFloat(e.target.value) || 0
                                              })}
                                              className="h-8 text-xs"
                                            />
                                          </div>
                                          <div>
                                            <Label className="text-xs">Số lượng Flash Sale *</Label>
                                            <Input
                                              type="number"
                                              min="0"
                                              max={product.stock || 0}
                                              value={form.flashSaleStock}
                                              onChange={(e) => setProductFlashSaleForm({
                                                ...form,
                                                flashSaleStock: Math.min(parseInt(e.target.value) || 0, product.stock || 0)
                                              })}
                                              className="h-8 text-xs"
                                            />
                                          </div>
                                          <div>
                                            <Label className="text-xs">SL tối đa/người *</Label>
                                            <Input
                                              type="number"
                                              min="1"
                                              value={form.maxQuantityPerUser}
                                              onChange={(e) => setProductFlashSaleForm({
                                                ...form,
                                                maxQuantityPerUser: parseInt(e.target.value) || 1
                                              })}
                                              className="h-8 text-xs"
                                            />
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowAddProductToFlashSale(false);
              setSelectedFlashSale(null);
              setEditingProductInFlashSale(null);
              setProductFlashSaleForm(null);
            }}>
              Hủy
            </Button>
            <Button
              onClick={async () => {
                if (!selectedFlashSale) return;
                
                if (editingProductInFlashSale) {
                  // Update existing product
                  if (!productFlashSaleForm) return;
                  
                  try {
                    const currentProducts = selectedFlashSale.products || [];
                    const updatedProducts = currentProducts.map(p => 
                      p.productId === productFlashSaleForm.productId
                        ? {
                            ...p,
                            flashSalePrice: productFlashSaleForm.flashSalePrice,
                            flashSaleStock: productFlashSaleForm.flashSaleStock,
                            maxQuantityPerUser: productFlashSaleForm.maxQuantityPerUser
                          }
                        : p
                    );
                    
                    await fetch(`${API_BASE_URL}/api/flashsales/${selectedFlashSale.id}/products`, {
                      method: 'PUT',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                      },
                      body: JSON.stringify(updatedProducts),
                    });
                    
                    toast({
                      title: 'Thành công',
                      description: 'Đã cập nhật sản phẩm',
                    });
                    
                    setShowAddProductToFlashSale(false);
                    setSelectedFlashSale(null);
                    setEditingProductInFlashSale(null);
                    setProductFlashSaleForm(null);
                    loadFlashSales();
                  } catch (error) {
                    console.error('Error updating product:', error);
                    toast({
                      title: 'Lỗi',
                      description: 'Không thể cập nhật sản phẩm',
                      variant: 'destructive',
                    });
                  }
                } else {
                  // Add new product
                  if (!productFlashSaleForm || !productFlashSaleForm.productId) {
                    toast({
                      title: 'Lỗi',
                      description: 'Vui lòng chọn sản phẩm',
                      variant: 'destructive',
                    });
                    return;
                  }
                  
                  const product = products.find((p: any) => p.id === productFlashSaleForm.productId);
                  if (!product) {
                    toast({
                      title: 'Lỗi',
                      description: 'Không tìm thấy sản phẩm',
                      variant: 'destructive',
                    });
                    return;
                  }
                  
                  try {
                    const currentProducts = selectedFlashSale.products || [];
                    const newProduct: FlashSaleProduct = {
                      productId: product.id,
                      productName: product.name,
                      productImage: product.images?.[0] || '',
                      originalPrice: product.price || 0,
                      flashSalePrice: productFlashSaleForm.flashSalePrice,
                      flashSaleStock: productFlashSaleForm.flashSaleStock,
                      soldCount: 0,
                      maxQuantityPerUser: productFlashSaleForm.maxQuantityPerUser
                    };
                    
                    const updatedProducts = [...currentProducts, newProduct];
                    
                    await fetch(`${API_BASE_URL}/api/flashsales/${selectedFlashSale.id}/products`, {
                      method: 'PUT',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                      },
                      body: JSON.stringify(updatedProducts),
                    });
                    
                    toast({
                      title: 'Thành công',
                      description: 'Đã thêm sản phẩm vào flash sale',
                    });
                    
                    setShowAddProductToFlashSale(false);
                    setSelectedFlashSale(null);
                    setProductFlashSaleForm(null);
                    loadFlashSales();
                  } catch (error) {
                    console.error('Error adding product:', error);
                    toast({
                      title: 'Lỗi',
                      description: 'Không thể thêm sản phẩm',
                      variant: 'destructive',
                    });
                  }
                }
              }}
            >
              {editingProductInFlashSale ? 'Cập nhật' : 'Thêm sản phẩm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SellerGuard>
  );
};

export default SellerDashboard;

