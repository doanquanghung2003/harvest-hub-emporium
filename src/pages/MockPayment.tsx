import { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CreditCard, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { bankCardService, type BankCard } from "@/services/bankCardService";
import { useAuth } from "@/hooks/useAuth";

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || '';

/**
 * Trang Mock Payment để test thanh toán online
 * Trang thanh toán trực tuyến
 * Xử lý thanh toán bằng thẻ ngân hàng
 */
export default function MockPayment() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [amount, setAmount] = useState<string>("");
  const [orderInfo, setOrderInfo] = useState<string>("");
  const [selectedCard, setSelectedCard] = useState<string>("success");
  const [processing, setProcessing] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const isMountedRef = useRef(true);
  const [bankCard, setBankCard] = useState<BankCard | null>(null);
  const [isLoadingCard, setIsLoadingCard] = useState(false);
  const [bankCardId, setBankCardId] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState<string>("");
  const [userProfile, setUserProfile] = useState<any>(null);
  const [otpError, setOtpError] = useState<string>("");

  useEffect(() => {
    isMountedRef.current = true;
    
    // Lấy thông tin từ URL params
    const vnpAmount = searchParams.get("vnp_Amount");
    const vnpOrderInfo = searchParams.get("vnp_OrderInfo");
    const vnpTxnRef = searchParams.get("vnp_TxnRef");
    const cardId = searchParams.get("bankCardId");

    if (isMountedRef.current) {
      if (vnpAmount) {
        setAmount((parseFloat(vnpAmount) / 100).toLocaleString("vi-VN"));
      }
      if (vnpOrderInfo) {
        setOrderInfo(vnpOrderInfo);
      }
      if (cardId) {
        setBankCardId(cardId);
      }
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [searchParams]);

  // Load bank card info if bankCardId is provided
  useEffect(() => {
    const loadBankCard = async () => {
      if (bankCardId && user) {
        setIsLoadingCard(true);
        try {
          const card = await bankCardService.getBankCard(bankCardId, user.id);
          setBankCard(card);
        } catch (error) {
          console.error('Error loading bank card:', error);
        } finally {
          setIsLoadingCard(false);
        }
      }
    };

    loadBankCard();
  }, [bankCardId, user]);

  // Load user profile to get payment PIN
  useEffect(() => {
    const loadUserProfile = async () => {
      if (user) {
        try {
          const token = localStorage.getItem('token');
          if (!token) return;
          
          const apiUrl = API_BASE_URL || 'http://localhost:8081';
          const response = await fetch(`${apiUrl}/api/user/profile`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            const profile = await response.json();
            setUserProfile(profile);
          }
        } catch (error) {
          console.error('Error loading user profile:', error);
        }
      }
    };

    loadUserProfile();
  }, [user]);

  const testCards = [
    {
      id: "success",
      name: "Thẻ thành công",
      number: "9704198526191432198",
      bank: "NCB",
      owner: "NGUYEN VAN A",
      expiry: "07/15",
      otp: "123456",
      description: "Giao dịch sẽ thành công",
    },
    {
      id: "insufficient",
      name: "Thẻ không đủ số dư",
      number: "9704195798459170488",
      bank: "NCB",
      owner: "NGUYEN VAN A",
      expiry: "07/15",
      otp: "123456",
      description: "Giao dịch sẽ thất bại - không đủ số dư",
    },
    {
      id: "inactive",
      name: "Thẻ chưa kích hoạt",
      number: "9704192181368742",
      bank: "NCB",
      owner: "NGUYEN VAN A",
      expiry: "07/15",
      otp: "123456",
      description: "Giao dịch sẽ thất bại - thẻ chưa kích hoạt",
    },
  ];

  const handlePayment = async () => {
    if (isRedirecting || !isMountedRef.current) return; // Prevent multiple redirects
    
    // Validate OTP code
    if (!otpCode || otpCode.length !== 6) {
      setOtpError("Vui lòng nhập mã khóa xác thực 6 số");
      return;
    }

    // Check if user has payment PIN set
    if (!userProfile || !userProfile.paymentPin) {
      setOtpError("Bạn chưa đăng ký mã khóa xác thực. Vui lòng đăng ký trong trang cá nhân.");
      return;
    }

    // Validate OTP matches user's payment PIN
    if (otpCode !== userProfile.paymentPin) {
      setOtpError("Mã khóa xác thực không đúng. Vui lòng thử lại.");
      return;
    }

    setOtpError("");
    setProcessing(true);
    
    try {
      // Simulate payment processing - show processing state
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Build return URL with result
      const returnParams = new URLSearchParams();
      returnParams.set("status", "completed");
      returnParams.set("vnp_ResponseCode", "00");
      returnParams.set("vnp_TransactionNo", "MOCK_" + Date.now());
      returnParams.set("vnp_TxnRef", searchParams.get("vnp_TxnRef") || "");
      returnParams.set("vnp_Amount", searchParams.get("vnp_Amount") || "");
      returnParams.set("vnp_OrderInfo", searchParams.get("vnp_OrderInfo") || "");

      // Set redirecting state only when actually redirecting
      setIsRedirecting(true);
      
      // Small delay to show "Redirecting..." message
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Use window.location.replace() instead of href to avoid history entry
      // This is safer for React as it doesn't trigger navigation events
      const baseUrl = window.location.origin;
      window.location.replace(`${baseUrl}/payment/return?${returnParams.toString()}`);
    } catch (error) {
      console.error("Error processing payment:", error);
      // If error, allow retry
      setIsRedirecting(false);
      setProcessing(false);
    }
  };

  const handleCancel = () => {
    if (isRedirecting || !isMountedRef.current) return; // Prevent multiple redirects
    
    setIsRedirecting(true);
    
    const returnParams = new URLSearchParams();
    returnParams.set("status", "failed");
    returnParams.set("vnp_ResponseCode", "24"); // User cancelled
    returnParams.set("vnp_TxnRef", searchParams.get("vnp_TxnRef") || "");
    
    // Use window.location.replace() instead of href
    const baseUrl = window.location.origin;
    window.location.replace(`${baseUrl}/payment/return?${returnParams.toString()}`);
  };

  const selectedCardData = testCards.find((c) => c.id === selectedCard);

  // Show loading/redirecting message instead of blank page
  if (isRedirecting) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center space-y-4 py-8">
              <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
              <p className="text-lg font-semibold">Đang chuyển hướng...</p>
              <p className="text-sm text-muted-foreground text-center">
                Vui lòng đợi trong giây lát
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-6 w-6" />
            Cổng thanh toán trực tuyến
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Order Info */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Thông tin đơn hàng</h3>
            <div className="space-y-1 text-sm">
              <p>
                <strong>Số tiền:</strong> {amount ? `${amount} VND` : "N/A"}
              </p>
              <p>
                <strong>Nội dung:</strong> {orderInfo || "N/A"}
              </p>
              <p>
                <strong>Mã đơn:</strong> {searchParams.get("vnp_TxnRef") || "N/A"}
              </p>
            </div>
          </div>

          {/* Bank Card Info (if using real bank card) */}
          {bankCardId && (
            <div className="space-y-4">
              {isLoadingCard ? (
                <div className="text-center py-4">Đang tải thông tin thẻ...</div>
              ) : bankCard ? (
                <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Thông tin thẻ ngân hàng
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <strong>Ngân hàng:</strong> {bankCard.bankName}
                    </div>
                    <div>
                      <strong>Số thẻ:</strong> {bankCard.cardNumberMasked || bankCardService.maskCardNumber(bankCard.cardNumber)}
                    </div>
                    <div>
                      <strong>Chủ thẻ:</strong> {bankCard.cardHolderName}
                    </div>
                    <div>
                      <strong>Hết hạn:</strong> {bankCard.expiryMonth && bankCard.expiryYear ? `${bankCard.expiryMonth}/${bankCard.expiryYear}` : 'N/A'}
                    </div>
                    <div>
                      <strong>Loại thẻ:</strong> {bankCard.cardType === "debit" ? "Thẻ ghi nợ" : bankCard.cardType === "credit" ? "Thẻ tín dụng" : "Thẻ trả trước"}
                    </div>
                    <div>
                      <strong>OTP:</strong> <span className="text-muted-foreground">123456</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    Không thể tải thông tin thẻ ngân hàng. Vui lòng thử lại.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Test Cards Selection (only show if not using real bank card) */}
          {!bankCardId && (
            <>
              <div className="space-y-4">
                <Label>Chọn thẻ test:</Label>
                <RadioGroup value={selectedCard} onValueChange={setSelectedCard}>
                  {testCards.map((card) => (
                    <div
                      key={card.id}
                      className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <RadioGroupItem value={card.id} id={card.id} className="mt-1" />
                      <Label htmlFor={card.id} className="flex-1 cursor-pointer">
                        <div>
                          <p className="font-semibold">{card.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {card.number} - {card.bank}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {card.description}
                          </p>
                        </div>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              {/* Selected Card Details */}
              {selectedCardData && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Thông tin thẻ đã chọn:</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <strong>Số thẻ:</strong> {selectedCardData.number}
                    </div>
                    <div>
                      <strong>Ngân hàng:</strong> {selectedCardData.bank}
                    </div>
                    <div>
                      <strong>Chủ thẻ:</strong> {selectedCardData.owner}
                    </div>
                    <div>
                      <strong>Hết hạn:</strong> {selectedCardData.expiry}
                    </div>
                    <div className="col-span-2">
                      <strong>OTP:</strong> {selectedCardData.otp}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* OTP Input */}
          <div className="space-y-2">
            <Label htmlFor="otpCode">Mã khóa xác thực (6 số)</Label>
            <Input
              id="otpCode"
              type="text"
              placeholder="Nhập mã 6 số"
              value={otpCode}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                setOtpCode(value);
                setOtpError("");
              }}
              maxLength={6}
              className={otpError ? "border-red-500" : ""}
            />
            {otpError && (
              <p className="text-sm text-red-600">{otpError}</p>
            )}
            {!userProfile?.paymentPin && (
              <p className="text-xs text-yellow-600">
                Bạn chưa đăng ký mã khóa xác thực. Vui lòng đăng ký trong trang cá nhân.
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <Button
              onClick={(e) => {
                e.preventDefault();
                handlePayment();
              }}
              disabled={processing || isRedirecting || !otpCode || otpCode.length !== 6}
              className="flex-1"
              size="lg"
              type="button"
            >
              {processing ? (
                "Đang xử lý..."
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Xác nhận thanh toán
                </>
              )}
            </Button>
            <Button
              onClick={(e) => {
                e.preventDefault();
                handleCancel();
              }}
              disabled={processing || isRedirecting}
              variant="outline"
              size="lg"
              type="button"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Hủy
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Vui lòng xác nhận thông tin thanh toán và nhấn "Xác nhận thanh toán" để hoàn tất giao dịch.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

