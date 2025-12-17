import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Wallet, Plus, ArrowDown, ArrowUp, CreditCard, History, Trash2, Edit, Star, CheckCircle, Shield } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { AuthGuard } from "@/components/AuthGuard";
import { walletService, type Wallet as WalletType, type WalletTransaction } from "@/services/walletService";
import { useToast } from "@/hooks/use-toast";
import { paymentService } from "@/services/paymentService";
import { bankCardService, type BankCard, type CreateBankCardRequest } from "@/services/bankCardService";

export default function WalletPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [wallet, setWallet] = useState<WalletType | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDepositing, setIsDepositing] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [depositMethod, setDepositMethod] = useState("wallet");
  const [isDepositDialogOpen, setIsDepositDialogOpen] = useState(false);
  const [isWithdrawDialogOpen, setIsWithdrawDialogOpen] = useState(false);
  const [selectedDepositCardId, setSelectedDepositCardId] = useState<string>("");
  
  // Bank card states
  const [bankCards, setBankCards] = useState<BankCard[]>([]);
  const [isLoadingCards, setIsLoadingCards] = useState(false);
  const [isCardDialogOpen, setIsCardDialogOpen] = useState(false);
  const [isEditCard, setIsEditCard] = useState(false);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  
  // Payment PIN states
  const [userProfile, setUserProfile] = useState<any>(null);
  const [paymentPin, setPaymentPin] = useState<string>("");
  const [confirmPaymentPin, setConfirmPaymentPin] = useState<string>("");
  const [isSavingPin, setIsSavingPin] = useState(false);
  const [pinError, setPinError] = useState<string>("");
  const [cardForm, setCardForm] = useState<CreateBankCardRequest>({
    cardNumber: "",
    cardHolderName: "",
    bankName: "",
    bankCode: "",
    expiryMonth: "",
    expiryYear: "",
    cardType: "debit",
    isDefault: false,
  });

  useEffect(() => {
    if (user) {
      loadWallet();
      loadTransactions();
      loadBankCards();
      loadUserProfile();
    }
  }, [user]);

  const loadUserProfile = async () => {
    if (!user) return;
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const apiUrl = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8081';
      const response = await fetch(`${apiUrl}/api/user/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const profile = await response.json();
        console.log('Loaded user profile:', profile);
        console.log('Payment PIN in profile:', profile.paymentPin);
        setUserProfile(profile);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  // Reload wallet when returning from payment or when deposit is completed
  useEffect(() => {
    const handleFocus = () => {
      if (user) {
        loadWallet();
        loadTransactions();
      }
    };
    
    const handleWalletDepositCompleted = (event: any) => {
      console.log("Wallet deposit completed event received:", event.detail);
      if (user) {
        loadWallet();
        loadTransactions();
      }
    };
    
    window.addEventListener('focus', handleFocus);
    window.addEventListener('wallet-deposit-completed', handleWalletDepositCompleted as EventListener);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('wallet-deposit-completed', handleWalletDepositCompleted as EventListener);
    };
  }, [user]);
  
  // Also reload when component becomes visible (user navigates back to wallet page)
  useEffect(() => {
    if (user && document.visibilityState === 'visible') {
      loadWallet();
      loadTransactions();
    }
  }, [user]);

  const loadWallet = async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      const walletData = await walletService.getWallet(user.id);
      setWallet(walletData);
    } catch (error: any) {
      console.error('Error loading wallet:', error);
      toast({
        title: "Lỗi",
        description: error.message || "Không thể tải thông tin ví",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadTransactions = async () => {
    if (!user) return;
    try {
      const transactionsData = await walletService.getTransactions(user.id, 50);
      setTransactions(transactionsData);
    } catch (error: any) {
      console.error('Error loading transactions:', error);
    }
  };

  const loadBankCards = async () => {
    if (!user) return;
    try {
      setIsLoadingCards(true);
      const cards = await bankCardService.getBankCards(user.id);
      console.log('Loaded bank cards:', cards);
      console.log('Cards with isDefault:', cards.map(c => ({ id: c.id, isDefault: c.isDefault })));
      setBankCards(cards);
    } catch (error: any) {
      console.error('Error loading bank cards:', error);
    } finally {
      setIsLoadingCards(false);
    }
  };

  const handleDeposit = async () => {
    if (!user || !depositAmount) return;
    
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Lỗi",
        description: "Vui lòng nhập số tiền hợp lệ",
        variant: "destructive",
      });
      return;
    }

    // Validate bank card selection if method is bank_card
    if (depositMethod === "bank_card" && !selectedDepositCardId) {
      toast({
        title: "Lỗi",
        description: "Vui lòng chọn thẻ ngân hàng",
        variant: "destructive",
      });
      setIsDepositing(false);
      return;
    }

    // Validate amount for QR Pay
    if (depositMethod === "qr_pay" && (!amount || amount < 10000)) {
      toast({
        title: "Lỗi",
        description: "Số tiền nạp tối thiểu là 10,000 VND",
        variant: "destructive",
      });
      setIsDepositing(false);
      return;
    }

    setIsDepositing(true);
    try {
      const depositRequest: any = {
        amount,
        paymentMethod: depositMethod,
        description: `Nạp tiền vào ví - ${amount.toLocaleString('vi-VN')} VND`,
      };
      
      // Add bankCardId if method is bank_card
      if (depositMethod === "bank_card" && selectedDepositCardId) {
        depositRequest.bankCardId = selectedDepositCardId;
      }
      
      const result = await walletService.deposit(user.id, depositRequest);

      if (result.payment && result.payment.paymentUrl) {
        // Redirect to payment gateway
        window.location.href = result.payment.paymentUrl;
      } else {
        // Direct deposit completed
        toast({
          title: "Thành công",
          description: `Đã nạp ${amount.toLocaleString('vi-VN')} VND vào ví`,
        });
        setIsDepositDialogOpen(false);
        setDepositAmount("");
        await loadWallet();
        await loadTransactions();
      }
    } catch (error: any) {
      console.error('Error depositing:', error);
      toast({
        title: "Lỗi",
        description: error.message || "Không thể nạp tiền",
        variant: "destructive",
      });
    } finally {
      setIsDepositing(false);
    }
  };

  const handleWithdraw = async () => {
    if (!user || !withdrawAmount) return;
    
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Lỗi",
        description: "Vui lòng nhập số tiền hợp lệ",
        variant: "destructive",
      });
      return;
    }

    if (wallet && amount > wallet.balance) {
      toast({
        title: "Lỗi",
        description: "Số dư không đủ",
        variant: "destructive",
      });
      return;
    }

    setIsWithdrawing(true);
    try {
      await walletService.withdraw(user.id, amount, `Rút tiền từ ví - ${amount.toLocaleString('vi-VN')} VND`);
      toast({
        title: "Thành công",
        description: `Đã rút ${amount.toLocaleString('vi-VN')} VND từ ví`,
      });
      setIsWithdrawDialogOpen(false);
      setWithdrawAmount("");
      await loadWallet();
      await loadTransactions();
    } catch (error: any) {
      console.error('Error withdrawing:', error);
      toast({
        title: "Lỗi",
        description: error.message || "Không thể rút tiền",
        variant: "destructive",
      });
    } finally {
      setIsWithdrawing(false);
    }
  };

  const getTransactionTypeLabel = (type: string) => {
    switch (type) {
      case "deposit": return "Nạp tiền";
      case "withdraw": return "Rút tiền";
      case "payment": return "Thanh toán";
      case "refund": return "Hoàn tiền";
      default: return type;
    }
  };

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case "deposit":
      case "refund":
        return "bg-green-100 text-green-800";
      case "withdraw":
      case "payment":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "failed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Bank card handlers
  const handleAddCard = () => {
    setIsEditCard(false);
    setEditingCardId(null);
    setCardForm({
      cardNumber: "",
      cardHolderName: "",
      bankName: "",
      bankCode: "",
      expiryMonth: "",
      expiryYear: "",
      cardType: "debit",
      isDefault: false,
    });
    setIsCardDialogOpen(true);
  };

  const handleEditCard = (card: BankCard) => {
    setIsEditCard(true);
    setEditingCardId(card.id);
    setCardForm({
      cardNumber: card.cardNumber,
      cardHolderName: card.cardHolderName,
      bankName: card.bankName,
      bankCode: card.bankCode,
      expiryMonth: card.expiryMonth,
      expiryYear: card.expiryYear,
      cardType: card.cardType,
      isDefault: card.isDefault,
    });
    setIsCardDialogOpen(true);
  };

  const handleSaveCard = async () => {
    if (!user) return;

    // Validation
    if (!cardForm.cardNumber || cardForm.cardNumber.length < 16) {
      toast({
        title: "Lỗi",
        description: "Số thẻ phải có ít nhất 16 chữ số",
        variant: "destructive",
      });
      return;
    }

    if (!cardForm.cardHolderName) {
      toast({
        title: "Lỗi",
        description: "Vui lòng nhập tên chủ thẻ",
        variant: "destructive",
      });
      return;
    }

    if (!cardForm.bankName) {
      toast({
        title: "Lỗi",
        description: "Vui lòng nhập tên ngân hàng",
        variant: "destructive",
      });
      return;
    }

    try {
      if (isEditCard && editingCardId) {
        await bankCardService.updateBankCard(editingCardId, user.id, cardForm);
        toast({
          title: "Thành công",
          description: "Cập nhật thẻ ngân hàng thành công",
        });
      } else {
        await bankCardService.addBankCard(user.id, cardForm);
        toast({
          title: "Thành công",
          description: "Thêm thẻ ngân hàng thành công",
        });
      }
      setIsCardDialogOpen(false);
      await loadBankCards();
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể lưu thẻ ngân hàng",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    if (!user) return;
    
    if (!confirm("Bạn có chắc chắn muốn xóa thẻ ngân hàng này?")) {
      return;
    }

    try {
      await bankCardService.deleteBankCard(cardId, user.id);
      toast({
        title: "Thành công",
        description: "Xóa thẻ ngân hàng thành công",
      });
      await loadBankCards();
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể xóa thẻ ngân hàng",
        variant: "destructive",
      });
    }
  };

  const handleRegisterPaymentPin = async () => {
    if (!user) return;

    // Validation
    if (!paymentPin || paymentPin.length !== 6) {
      setPinError("Mã khóa xác thực phải có đúng 6 chữ số");
      return;
    }

    if (paymentPin !== confirmPaymentPin) {
      setPinError("Mã khóa xác thực không khớp");
      return;
    }

    setIsSavingPin(true);
    setPinError("");

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Không tìm thấy token');
      }

      const apiUrl = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8081';
      const response = await fetch(`${apiUrl}/api/user/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          paymentPin: paymentPin
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Không thể đăng ký mã khóa xác thực');
      }

      const result = await response.json();
      console.log('Payment PIN registration response:', result);

      // Update state immediately
      if (result.user) {
        setUserProfile(result.user);
      } else {
        // Fallback: update manually
        setUserProfile(prev => ({
          ...prev,
          paymentPin: paymentPin,
          hasPaymentPin: true
        }));
      }

      toast({
        title: "Thành công",
        description: "Đã đăng ký mã khóa xác thực thành công",
      });

      setPaymentPin("");
      setConfirmPaymentPin("");
      
      // Reload to ensure consistency
      await loadUserProfile();
    } catch (error: any) {
      console.error('Error registering payment PIN:', error);
      setPinError(error.message || 'Không thể đăng ký mã khóa xác thực');
    } finally {
      setIsSavingPin(false);
    }
  };

  const handleUpdatePaymentPin = async () => {
    if (!user) return;

    // Validation
    if (!paymentPin || paymentPin.length !== 6) {
      setPinError("Mã khóa xác thực phải có đúng 6 chữ số");
      return;
    }

    if (paymentPin !== confirmPaymentPin) {
      setPinError("Mã khóa xác thực không khớp");
      return;
    }

    setIsSavingPin(true);
    setPinError("");

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Không tìm thấy token');
      }

      const apiUrl = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8081';
      const response = await fetch(`${apiUrl}/api/user/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          paymentPin: paymentPin
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Không thể cập nhật mã khóa xác thực');
      }

      const result = await response.json();
      console.log('Payment PIN update response:', result);

      // Update state immediately
      if (result.user) {
        setUserProfile(result.user);
      } else {
        // Fallback: update manually
        setUserProfile(prev => ({
          ...prev,
          paymentPin: paymentPin,
          hasPaymentPin: true
        }));
      }

      toast({
        title: "Thành công",
        description: "Đã cập nhật mã khóa xác thực thành công",
      });

      setPaymentPin("");
      setConfirmPaymentPin("");
      
      // Reload to ensure consistency
      await loadUserProfile();
    } catch (error: any) {
      console.error('Error updating payment PIN:', error);
      setPinError(error.message || 'Không thể cập nhật mã khóa xác thực');
    } finally {
      setIsSavingPin(false);
    }
  };

  const handleSetDefaultCard = async (cardId: string) => {
    if (!user) return;

    try {
      console.log('Setting default card:', cardId);
      console.log('Current cards before update:', bankCards.map(c => ({ id: c.id, isDefault: c.isDefault })));
      
      await bankCardService.setDefaultCard(cardId, user.id);
      
      // Update state immediately for better UX - set the selected card as default and unset others
      setBankCards(prevCards => {
        const updated = prevCards.map(card => ({
          ...card,
          isDefault: card.id === cardId
        }));
        console.log('Updated cards state (immediate):', updated.map(c => ({ id: c.id, isDefault: c.isDefault })));
        return updated;
      });
      
      toast({
        title: "Thành công",
        description: "Đã đặt thẻ làm mặc định",
      });
      
      // Small delay to ensure backend has processed, then reload
      setTimeout(async () => {
        await loadBankCards();
      }, 500);
    } catch (error: any) {
      console.error('Error setting default card:', error);
      toast({
        title: "Lỗi",
        description: error.message || "Không thể đặt thẻ mặc định",
        variant: "destructive",
      });
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 py-8">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="mb-6">
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Wallet className="h-8 w-8" />
                Ví Tiền Của Tôi
              </h1>
              <p className="text-muted-foreground mt-2">Quản lý số dư và lịch sử giao dịch</p>
            </div>

            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList>
                <TabsTrigger value="overview">Tổng quan</TabsTrigger>
                <TabsTrigger value="transactions">Lịch sử giao dịch</TabsTrigger>
                <TabsTrigger value="cards">Thẻ ngân hàng</TabsTrigger>
                <TabsTrigger value="security">Bảo mật</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                {/* Balance Card */}
                <Card>
                  <CardHeader>
                    <CardTitle>Số dư hiện tại</CardTitle>
                    <CardDescription>Ví tiền của bạn</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <div className="text-center py-8">Đang tải...</div>
                    ) : wallet ? (
                      <div className="space-y-6">
                        <div className="text-center py-8">
                          <div className="text-5xl font-bold text-primary mb-2">
                            {wallet.balance.toLocaleString('vi-VN')} <span className="text-2xl">VND</span>
                          </div>
                          <Badge className={wallet.status === 'active' ? 'bg-green-500' : ''}>
                            {wallet.status === 'active' ? 'Hoạt động' : wallet.status}
                          </Badge>
                        </div>

                        <div className="flex gap-4 justify-center">
                          <Dialog open={isDepositDialogOpen} onOpenChange={setIsDepositDialogOpen}>
                            <DialogTrigger asChild>
                              <Button size="lg" className="gap-2">
                                <Plus className="h-5 w-5" />
                                Nạp tiền
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Nạp tiền vào ví</DialogTitle>
                                <DialogDescription>
                                  Chọn phương thức thanh toán và số tiền bạn muốn nạp
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                  <Label htmlFor="depositAmount">Số tiền (VND)</Label>
                                  <Input
                                    id="depositAmount"
                                    type="number"
                                    placeholder="Nhập số tiền"
                                    value={depositAmount}
                                    onChange={(e) => setDepositAmount(e.target.value)}
                                    min="10000"
                                    step="10000"
                                  />
                                  <p className="text-xs text-muted-foreground">
                                    Số tiền tối thiểu: 10,000 VND
                                  </p>
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="depositMethod">Phương thức thanh toán</Label>
                                  <Select value={depositMethod} onValueChange={(value) => {
                                    setDepositMethod(value);
                                    if (value !== "bank_card") {
                                      setSelectedDepositCardId("");
                                    } else if (bankCards.length > 0) {
                                      const defaultCard = bankCards.find(c => c.isDefault);
                                      setSelectedDepositCardId(defaultCard ? defaultCard.id : bankCards[0].id);
                                    }
                                  }}>
                                    <SelectTrigger id="depositMethod">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="bank_card">Thẻ ngân hàng</SelectItem>
                                      <SelectItem value="qr_pay">QR Pay</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                
                                {/* Bank Card Selection for Deposit */}
                                {depositMethod === "bank_card" && (
                                  <div className="space-y-2">
                                    {bankCards.length === 0 ? (
                                      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                        <p className="text-sm text-yellow-800 mb-2">
                                          Bạn chưa có thẻ ngân hàng nào. Vui lòng thêm thẻ trước.
                                        </p>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => {
                                            setIsDepositDialogOpen(false);
                                            // Navigate to cards tab
                                            setTimeout(() => {
                                              const cardsTab = document.querySelector('[value="cards"]');
                                              if (cardsTab) {
                                                (cardsTab as HTMLElement).click();
                                              }
                                            }, 100);
                                          }}
                                        >
                                          Thêm thẻ ngân hàng
                                        </Button>
                                      </div>
                                    ) : (
                                      <>
                                        <Label htmlFor="depositCard">Chọn thẻ ngân hàng</Label>
                                        <Select value={selectedDepositCardId} onValueChange={setSelectedDepositCardId}>
                                          <SelectTrigger id="depositCard">
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
                                        {selectedDepositCardId && (
                                          <p className="text-xs text-muted-foreground">
                                            Thẻ: {bankCards.find(c => c.id === selectedDepositCardId)?.cardHolderName}
                                          </p>
                                        )}
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                              <DialogFooter>
                                <Button variant="outline" onClick={() => setIsDepositDialogOpen(false)}>
                                  Hủy
                                </Button>
                                <Button onClick={handleDeposit} disabled={isDepositing}>
                                  {isDepositing ? "Đang xử lý..." : "Nạp tiền"}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>

                          <Dialog open={isWithdrawDialogOpen} onOpenChange={setIsWithdrawDialogOpen}>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="lg" className="gap-2">
                                <ArrowDown className="h-5 w-5" />
                                Rút tiền
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Rút tiền từ ví</DialogTitle>
                                <DialogDescription>
                                  Nhập số tiền bạn muốn rút (số dư hiện tại: {wallet?.balance.toLocaleString('vi-VN')} VND)
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                  <Label htmlFor="withdrawAmount">Số tiền (VND)</Label>
                                  <Input
                                    id="withdrawAmount"
                                    type="number"
                                    placeholder="Nhập số tiền"
                                    value={withdrawAmount}
                                    onChange={(e) => setWithdrawAmount(e.target.value)}
                                    min="10000"
                                    step="10000"
                                    max={wallet?.balance || 0}
                                  />
                                  <p className="text-xs text-muted-foreground">
                                    Số tiền tối thiểu: 10,000 VND
                                  </p>
                                </div>
                              </div>
                              <DialogFooter>
                                <Button variant="outline" onClick={() => setIsWithdrawDialogOpen(false)}>
                                  Hủy
                                </Button>
                                <Button onClick={handleWithdraw} disabled={isWithdrawing}>
                                  {isWithdrawing ? "Đang xử lý..." : "Rút tiền"}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        Không thể tải thông tin ví
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Quick Stats */}
                <div className="grid md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Tổng nạp</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        {transactions
                          .filter(t => t.type === 'deposit' && t.status === 'completed')
                          .reduce((sum, t) => sum + t.amount, 0)
                          .toLocaleString('vi-VN')} VND
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Tổng chi</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-red-600">
                        {transactions
                          .filter(t => (t.type === 'payment' || t.type === 'withdraw') && t.status === 'completed')
                          .reduce((sum, t) => sum + t.amount, 0)
                          .toLocaleString('vi-VN')} VND
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Tổng giao dịch</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {transactions.length}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="transactions" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <History className="h-5 w-5" />
                      Lịch sử giao dịch
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {transactions.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        Chưa có giao dịch nào
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Thời gian</TableHead>
                            <TableHead>Loại</TableHead>
                            <TableHead>Mô tả</TableHead>
                            <TableHead className="text-right">Số tiền</TableHead>
                            <TableHead className="text-right">Số dư sau</TableHead>
                            <TableHead>Trạng thái</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {transactions.map((transaction) => (
                            <TableRow key={transaction.id}>
                              <TableCell>
                                {transaction.createdAt
                                  ? new Date(transaction.createdAt).toLocaleString('vi-VN')
                                  : 'N/A'}
                              </TableCell>
                              <TableCell>
                                <Badge className={getTransactionTypeColor(transaction.type)}>
                                  {getTransactionTypeLabel(transaction.type)}
                                </Badge>
                              </TableCell>
                              <TableCell>{transaction.description}</TableCell>
                              <TableCell className={`text-right font-semibold ${
                                transaction.type === 'deposit' || transaction.type === 'refund'
                                  ? 'text-green-600'
                                  : 'text-red-600'
                              }`}>
                                {(transaction.type === 'deposit' || transaction.type === 'refund' ? '+' : '-')}
                                {transaction.amount.toLocaleString('vi-VN')} VND
                              </TableCell>
                              <TableCell className="text-right">
                                {transaction.balanceAfter.toLocaleString('vi-VN')} VND
                              </TableCell>
                              <TableCell>
                                <Badge className={getStatusColor(transaction.status)}>
                                  {transaction.status === 'completed' ? 'Hoàn thành' :
                                   transaction.status === 'pending' ? 'Đang xử lý' :
                                   transaction.status === 'failed' ? 'Thất bại' :
                                   transaction.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="cards" className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <CreditCard className="h-5 w-5" />
                          Thẻ ngân hàng
                        </CardTitle>
                        <CardDescription>Quản lý thông tin thẻ ngân hàng của bạn</CardDescription>
                      </div>
                      <Button onClick={handleAddCard} className="gap-2">
                        <Plus className="h-4 w-4" />
                        Thêm thẻ
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {isLoadingCards ? (
                      <div className="text-center py-8">Đang tải...</div>
                    ) : bankCards.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Chưa có thẻ ngân hàng nào</p>
                        <Button onClick={handleAddCard} className="mt-4" variant="outline">
                          Thêm thẻ đầu tiên
                        </Button>
                      </div>
                    ) : (
                      <div className="grid gap-4 md:grid-cols-2">
                        {bankCards.map((card) => (
                          <Card key={card.id} className={card.isDefault ? "border-primary border-2" : ""}>
                            <CardContent className="pt-6">
                              <div className="space-y-4">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      {card.isDefault && (
                                        <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                                      )}
                                      {!card.isDefault && <CreditCard className="h-5 w-5" />}
                                      <span className="font-semibold">{card.bankName}</span>
                                      {card.isDefault && (
                                        <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
                                          <Star className="h-3 w-3 mr-1 fill-yellow-400 text-yellow-400" />
                                          Mặc định
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-2xl font-mono font-bold mb-1">
                                      {card.cardNumberMasked || bankCardService.maskCardNumber(card.cardNumber)}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                      {card.cardHolderName}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                      Hết hạn: {card.expiryMonth && card.expiryYear ? `${card.expiryMonth}/${card.expiryYear}` : 'N/A'}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {card.cardType === "debit" ? "Thẻ ghi nợ" : 
                                       card.cardType === "credit" ? "Thẻ tín dụng" : 
                                       "Thẻ trả trước"}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex gap-2 pt-4 border-t">
                                  {!card.isDefault && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleSetDefaultCard(card.id)}
                                      className="flex-1"
                                    >
                                      <Star className="h-4 w-4 mr-1" />
                                      Đặt mặc định
                                    </Button>
                                  )}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleEditCard(card)}
                                    className="flex-1"
                                  >
                                    <Edit className="h-4 w-4 mr-1" />
                                    Sửa
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDeleteCard(card.id)}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Add/Edit Card Dialog */}
                <Dialog open={isCardDialogOpen} onOpenChange={setIsCardDialogOpen}>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>
                        {isEditCard ? "Sửa thẻ ngân hàng" : "Thêm thẻ ngân hàng"}
                      </DialogTitle>
                      <DialogDescription>
                        {isEditCard ? "Cập nhật thông tin thẻ ngân hàng" : "Nhập thông tin thẻ ngân hàng của bạn"}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="cardNumber">Số thẻ</Label>
                        <Input
                          id="cardNumber"
                          placeholder="1234 5678 9012 3456"
                          value={cardForm.cardNumber}
                          onChange={(e) => setCardForm({ ...cardForm, cardNumber: e.target.value.replace(/\s/g, "") })}
                          maxLength={19}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cardHolderName">Tên chủ thẻ</Label>
                        <Input
                          id="cardHolderName"
                          placeholder="NGUYEN VAN A"
                          value={cardForm.cardHolderName}
                          onChange={(e) => setCardForm({ ...cardForm, cardHolderName: e.target.value.toUpperCase() })}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="expiryMonth">Tháng hết hạn</Label>
                          <Input
                            id="expiryMonth"
                            placeholder="MM"
                            value={cardForm.expiryMonth}
                            onChange={(e) => setCardForm({ ...cardForm, expiryMonth: e.target.value })}
                            maxLength={2}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="expiryYear">Năm hết hạn</Label>
                          <Input
                            id="expiryYear"
                            placeholder="YYYY"
                            value={cardForm.expiryYear}
                            onChange={(e) => setCardForm({ ...cardForm, expiryYear: e.target.value })}
                            maxLength={4}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bankName">Tên ngân hàng</Label>
                        <Input
                          id="bankName"
                          placeholder="Vietcombank"
                          value={cardForm.bankName}
                          onChange={(e) => setCardForm({ ...cardForm, bankName: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bankCode">Mã ngân hàng (tùy chọn)</Label>
                        <Input
                          id="bankCode"
                          placeholder="VCB"
                          value={cardForm.bankCode}
                          onChange={(e) => setCardForm({ ...cardForm, bankCode: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cardType">Loại thẻ</Label>
                        <Select value={cardForm.cardType} onValueChange={(value) => setCardForm({ ...cardForm, cardType: value })}>
                          <SelectTrigger id="cardType">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="debit">Thẻ ghi nợ</SelectItem>
                            <SelectItem value="credit">Thẻ tín dụng</SelectItem>
                            <SelectItem value="prepaid">Thẻ trả trước</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="isDefault"
                          checked={cardForm.isDefault}
                          onChange={(e) => setCardForm({ ...cardForm, isDefault: e.target.checked })}
                          className="h-4 w-4"
                        />
                        <Label htmlFor="isDefault" className="cursor-pointer">
                          Đặt làm thẻ mặc định
                        </Label>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsCardDialogOpen(false)}>
                        Hủy
                      </Button>
                      <Button onClick={handleSaveCard}>
                        {isEditCard ? "Cập nhật" : "Thêm thẻ"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </TabsContent>

              <TabsContent value="security" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Mã khóa xác thực thanh toán
                    </CardTitle>
                    <CardDescription>
                      Đăng ký mã khóa xác thực 6 số để bảo vệ giao dịch thanh toán của bạn
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {userProfile?.paymentPin ? (
                      <div className="space-y-4">
                        <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                            <p className="font-semibold text-green-800">Đã đăng ký mã khóa xác thực</p>
                          </div>
                          <p className="text-sm text-green-700">
                            Bạn đã đăng ký mã khóa xác thực. Mã này sẽ được yêu cầu khi thực hiện thanh toán.
                          </p>
                        </div>
                        
                        <div className="space-y-4 pt-4 border-t">
                          <h3 className="font-semibold">Thay đổi mã khóa xác thực</h3>
                          <div className="space-y-2">
                            <Label htmlFor="newPaymentPin">Mã mới (6 số)</Label>
                            <Input
                              id="newPaymentPin"
                              type="text"
                              placeholder="Nhập mã 6 số"
                              value={paymentPin}
                              onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                                setPaymentPin(value);
                                setPinError("");
                              }}
                              maxLength={6}
                              className={pinError ? "border-red-500" : ""}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="confirmPaymentPin">Xác nhận mã mới (6 số)</Label>
                            <Input
                              id="confirmPaymentPin"
                              type="text"
                              placeholder="Nhập lại mã 6 số"
                              value={confirmPaymentPin}
                              onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                                setConfirmPaymentPin(value);
                                setPinError("");
                              }}
                              maxLength={6}
                              className={pinError ? "border-red-500" : ""}
                            />
                          </div>
                          {pinError && (
                            <p className="text-sm text-red-600">{pinError}</p>
                          )}
                          <Button
                            onClick={handleUpdatePaymentPin}
                            disabled={isSavingPin || !paymentPin || paymentPin.length !== 6 || !confirmPaymentPin || confirmPaymentPin.length !== 6}
                            className="w-full"
                          >
                            {isSavingPin ? "Đang lưu..." : "Cập nhật mã khóa xác thực"}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                          <p className="text-sm text-yellow-800">
                            Bạn chưa đăng ký mã khóa xác thực. Vui lòng đăng ký để bảo vệ giao dịch thanh toán của bạn.
                          </p>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="paymentPin">Mã khóa xác thực (6 số)</Label>
                          <Input
                            id="paymentPin"
                            type="text"
                            placeholder="Nhập mã 6 số"
                            value={paymentPin}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                              setPaymentPin(value);
                              setPinError("");
                            }}
                            maxLength={6}
                            className={pinError ? "border-red-500" : ""}
                          />
                          <p className="text-xs text-muted-foreground">
                            Mã khóa xác thực phải có đúng 6 chữ số
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="confirmPaymentPin">Xác nhận mã khóa xác thực (6 số)</Label>
                          <Input
                            id="confirmPaymentPin"
                            type="text"
                            placeholder="Nhập lại mã 6 số"
                            value={confirmPaymentPin}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                              setConfirmPaymentPin(value);
                              setPinError("");
                            }}
                            maxLength={6}
                            className={pinError ? "border-red-500" : ""}
                          />
                        </div>
                        {pinError && (
                          <p className="text-sm text-red-600">{pinError}</p>
                        )}
                        <Button
                          onClick={handleRegisterPaymentPin}
                          disabled={isSavingPin || !paymentPin || paymentPin.length !== 6 || !confirmPaymentPin || confirmPaymentPin.length !== 6}
                          className="w-full"
                        >
                          {isSavingPin ? "Đang đăng ký..." : "Đăng ký mã khóa xác thực"}
                        </Button>
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
}

