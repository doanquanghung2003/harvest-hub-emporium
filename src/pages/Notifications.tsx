import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Bell, Package, ShoppingCart, Heart, Star, Check, Trash2, Settings, MessageCircle, Send, Clock } from "lucide-react";
import { AuthGuard } from "@/components/AuthGuard";
import { useAuth } from "@/hooks/useAuth";
import { notificationService } from "@/services/adminService";
import { messageService, Conversation, Message as ConversationMessage } from "@/services/messageService";

const Notifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  // Load notifications from API
  useEffect(() => {
    const loadNotifications = async () => {
      if (!user?.id) return;
      
      try {
        setLoading(true);
        const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || '';
        const response = await fetch(`${API_BASE_URL}/api/notifications/user/${user.id}`);
        if (!response.ok) throw new Error('Không thể tải thông báo');
        const data = await response.json();
        // Sắp xếp theo thời gian mới nhất lên đầu
        const sortedData = data.sort((a: any, b: any) => b.createdAt - a.createdAt);
        setNotifications(sortedData);
      } catch (err) {
        setError(err.message);
        console.error('Error loading notifications:', err);
      } finally {
        setLoading(false);
      }
    };

    loadNotifications();
  }, [user?.id]);

  useEffect(() => {
    const loadConversations = async () => {
      if (!user?.id) return;
      try {
        setIsLoadingMessages(true);
        const data = await messageService.getConversationsByCustomer(user.id);
        setConversations(data);
        if (data.length > 0) {
          setActiveConversationId((prev) => prev ?? data[0].id);
        }
      } catch (err) {
        console.error("Failed to load conversations:", err);
      } finally {
        setIsLoadingMessages(false);
      }
    };
    loadConversations();
  }, [user?.id]);

  useEffect(() => {
    if (conversations.length === 0) {
      setActiveConversationId(null);
      return;
    }
    if (!activeConversationId) {
      setActiveConversationId(conversations[0].id);
    } else {
      const exists = conversations.some((conv) => conv.id === activeConversationId);
      if (!exists) {
        setActiveConversationId(conversations[0].id);
      }
    }
  }, [conversations, activeConversationId]);

  const markAsRead = async (id: string) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications(notifications.map(notif => 
        notif.id === id ? { ...notif, read: true } : notif
      ));
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(notif => !notif.read);
      await Promise.all(unreadNotifications.map(notif => notificationService.markAsRead(notif.id)));
      setNotifications(notifications.map(notif => ({ ...notif, read: true })));
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

  const deleteNotification = (id: string) => {
    setNotifications(notifications.filter(notif => notif.id !== id));
  };

  const getNotificationsByType = (type: string) => {
    if (type === "all") return notifications;
    return notifications.filter(notif => notif.type === type);
  };

  const unreadCount = notifications.filter(notif => !notif.read).length;

  const getTypeColor = (type: string) => {
    switch (type) {
      case "ORDER": return "text-blue-600";
      case "PROMO": return "text-green-600";
      case "INFO": return "text-red-600";
      case "SYSTEM": return "text-purple-600";
      default: return "text-gray-600";
    }
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case "ORDER": return Package;
      case "PROMO": return Star;
      case "INFO": return Heart;
      case "SYSTEM": return Settings;
      default: return Bell;
    }
  };

  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Vừa xong";
    if (minutes < 60) return `${minutes} phút trước`;
    if (hours < 24) return `${hours} giờ trước`;
    return `${days} ngày trước`;
  };

  const activeConversation = conversations.find((conv) => conv.id === activeConversationId) || null;

  const formatChatTimestamp = (timestamp?: number) => {
    if (!timestamp) return "";
    return new Date(timestamp).toLocaleString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
    });
  };

  const handleSelectConversation = (conversationId: string) => {
    setActiveConversationId(conversationId);
  };

  const handleSendMessage = async () => {
    if (!activeConversation || !chatInput.trim() || !user?.id) return;
    try {
      setIsSendingMessage(true);
      const payload: ConversationMessage = {
        senderId: user.id,
        senderName: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.username || "Bạn",
        role: "customer",
        content: chatInput.trim(),
        timestamp: Date.now(),
      };
      const updated = await messageService.sendMessage(activeConversation.id, payload);
      setConversations((prev) =>
        prev.map((conv) => (conv.id === updated.id ? updated : conv))
      );
      setChatInput("");
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setIsSendingMessage(false);
    }
  };

  if (loading) {
    return (
      <AuthGuard>
        <div className="min-h-screen flex flex-col">
          <Header />
          <main className="flex-1 py-8">
            <div className="container mx-auto px-4 max-w-4xl">
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Bell className="w-16 h-16 mx-auto mb-4 text-muted-foreground animate-pulse" />
                  <h3 className="text-lg font-semibold mb-2">Đang tải thông báo...</h3>
                </div>
              </div>
            </div>
          </main>
          <Footer />
        </div>
      </AuthGuard>
    );
  }

  if (error) {
    return (
      <AuthGuard>
        <div className="min-h-screen flex flex-col">
          <Header />
          <main className="flex-1 py-8">
            <div className="container mx-auto px-4 max-w-4xl">
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Bell className="w-16 h-16 mx-auto mb-4 text-destructive" />
                  <h3 className="text-lg font-semibold mb-2">Lỗi tải thông báo</h3>
                  <p className="text-muted-foreground">{error}</p>
                </div>
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
          <div className="container mx-auto px-4 max-w-4xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <Bell className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold">Thông báo</h1>
                <p className="text-muted-foreground">
                  {unreadCount > 0 ? `${unreadCount} thông báo chưa đọc` : "Tất cả thông báo đã được đọc"}
                </p>
              </div>
            </div>
            {unreadCount > 0 && (
              <Button onClick={markAllAsRead} variant="outline">
                <Check className="w-4 h-4 mr-2" />
                Đánh dấu tất cả đã đọc
              </Button>
            )}
          </div>

          {/* Notification Tabs */}
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="all">
                Tất cả
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="ml-2 text-xs">
                    {unreadCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="ORDER">Đơn hàng</TabsTrigger>
              <TabsTrigger value="PROMO">Khuyến mãi</TabsTrigger>
              <TabsTrigger value="INFO">Thông tin</TabsTrigger>
              <TabsTrigger value="SYSTEM">Hệ thống</TabsTrigger>
              <TabsTrigger value="MESSAGES" className="flex items-center gap-2">
                <span className="flex items-center gap-1">
                  <MessageCircle className="h-4 w-4" />
                  Tin nhắn
                </span>
                <Badge className="text-xs px-2">
                  {conversations.length > 99 ? "99+" : conversations.length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-6">
              <div className="space-y-4">
                {notifications.length === 0 ? (
                  <Card>
                    <CardContent className="text-center py-12">
                      <Bell className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-semibold mb-2">Không có thông báo</h3>
                      <p className="text-muted-foreground">Bạn chưa có thông báo nào</p>
                    </CardContent>
                  </Card>
                ) : (
                  notifications.map((notification) => {
                    const IconComponent = getIconForType(notification.type);
                    return (
                      <Card key={notification.id} className={`transition-all ${!notification.read ? 'border-primary/50 bg-primary/5' : ''}`}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            <div className={`p-2 rounded-full bg-gray-100 ${getTypeColor(notification.type)}`}>
                              <IconComponent className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                  <h4 className="font-semibold">{notification.title}</h4>
                                  <p className="text-sm text-muted-foreground">{notification.message}</p>
                                  <p className="text-xs text-muted-foreground">{formatTime(notification.createdAt)}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  {!notification.read && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => markAsRead(notification.id)}
                                    >
                                      <Check className="w-4 h-4" />
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => deleteNotification(notification.id)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </TabsContent>

            {[
              { value: "ORDER", label: "Đơn hàng" },
              { value: "PROMO", label: "Khuyến mãi" },
              { value: "INFO", label: "Thông tin" },
              { value: "SYSTEM", label: "Hệ thống" }
            ].map(({ value, label }) => (
              <TabsContent key={value} value={value} className="mt-6">
                <div className="space-y-4">
                  {getNotificationsByType(value).length === 0 ? (
                    <Card>
                      <CardContent className="text-center py-12">
                        <Bell className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="text-lg font-semibold mb-2">Không có thông báo</h3>
                        <p className="text-muted-foreground">Không có thông báo nào trong danh mục này</p>
                      </CardContent>
                    </Card>
                  ) : (
                    getNotificationsByType(value).map((notification) => {
                      const IconComponent = getIconForType(notification.type);
                      return (
                        <Card key={notification.id} className={`transition-all ${!notification.read ? 'border-primary/50 bg-primary/5' : ''}`}>
                          <CardContent className="p-4">
                            <div className="flex items-start gap-4">
                              <div className={`p-2 rounded-full bg-gray-100 ${getTypeColor(notification.type)}`}>
                                <IconComponent className="w-5 h-5" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-start justify-between">
                                  <div className="space-y-1">
                                    <h4 className="font-semibold">{notification.title}</h4>
                                    <p className="text-sm text-muted-foreground">{notification.message}</p>
                                    <p className="text-xs text-muted-foreground">{formatTime(notification.createdAt)}</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {!notification.read && (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => markAsRead(notification.id)}
                                      >
                                        <Check className="w-4 h-4" />
                                      </Button>
                                    )}
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => deleteNotification(notification.id)}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>
              </TabsContent>
            ))}

            <TabsContent value="MESSAGES" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Hộp thư với nhà bán hàng</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingMessages ? (
                    <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
                      <Clock className="h-5 w-5 animate-spin" />
                      Đang tải tin nhắn...
                    </div>
                  ) : conversations.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <MessageCircle className="h-10 w-10 mx-auto mb-3" />
                      Bạn chưa trao đổi với nhà bán nào.
                    </div>
                  ) : (
                    <div className="flex flex-col lg:flex-row gap-4">
                      <div className="lg:w-2/5 space-y-3 max-h-[420px] overflow-auto">
                        {conversations.map((conversation) => {
                          const lastMessage =
                            conversation.messages && conversation.messages.length
                              ? conversation.messages[conversation.messages.length - 1]
                              : null;
                          const isActive = activeConversationId === conversation.id;
                          return (
                            <button
                              key={conversation.id}
                              onClick={() => handleSelectConversation(conversation.id)}
                              className={`w-full text-left p-4 rounded-2xl border transition ${
                                isActive ? "border-primary bg-primary/5 shadow-sm" : "border-muted hover:border-primary/40"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center font-semibold text-primary">
                                  {(conversation.sellerId || "N").charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex justify-between items-center gap-2">
                                    <p className="font-semibold truncate">{conversation.sellerId || "Nhà bán"}</p>
                                    <span className="text-xs text-muted-foreground">
                                      {formatChatTimestamp(lastMessage?.timestamp)}
                                    </span>
                                  </div>
                                  <p className="text-sm text-muted-foreground truncate">
                                    {lastMessage ? lastMessage.content : "Chưa có tin nhắn"}
                                  </p>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                      <div className="lg:flex-1 border rounded-2xl p-4 space-y-4 min-h-[320px]">
                        {activeConversation ? (
                          <>
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-semibold text-lg">{activeConversation.sellerId || "Nhà bán hàng"}</p>
                                <p className="text-sm text-muted-foreground">
                                  Mã đơn: {activeConversation.orderId || "Không có"}
                                </p>
                              </div>
                              <Badge variant="outline" className="flex items-center gap-1">
                                <MessageCircle className="h-3 w-3" />
                                Chat
                              </Badge>
                            </div>
                            <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                              {(activeConversation.messages || []).length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-6">
                                  Chưa có tin nhắn trong cuộc trò chuyện này.
                                </p>
                              ) : (
                                activeConversation.messages!.map((message, idx) => (
                                  <div
                                    key={`${message.timestamp}-${idx}`}
                                    className={`flex ${message.role === "customer" ? "justify-end" : "justify-start"}`}
                                  >
                                    <div
                                      className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                                        message.role === "customer"
                                          ? "bg-primary text-primary-foreground rounded-br-none"
                                          : "bg-muted text-foreground rounded-bl-none"
                                      }`}
                                    >
                                      <p>{message.content}</p>
                                      <span className="block text-[11px] text-muted-foreground/80 mt-1">
                                        {formatChatTimestamp(message.timestamp)}
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
                            <p>Chọn một cuộc trò chuyện để xem chi tiết.</p>
                          </div>
                        )}
                      </div>
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
    </AuthGuard>
  );
};

export default Notifications;