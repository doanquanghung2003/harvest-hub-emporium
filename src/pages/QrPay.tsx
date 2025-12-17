import { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QrCode, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { paymentService } from "@/services/paymentService";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { AuthGuard } from "@/components/AuthGuard";

/**
 * Trang thanh toán bằng QR Pay
 * Hiển thị mã QR để người dùng quét và thanh toán
 */
export default function QrPay() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [orderId, setOrderId] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [amount, setAmount] = useState<number>(0);
  const [qrCode, setQrCode] = useState<string>("");
  const [status, setStatus] = useState<"pending" | "success" | "failed">("pending");
  const [isLoading, setIsLoading] = useState(true);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    
    const orderIdParam = searchParams.get("orderId");
    const paymentIdParam = searchParams.get("paymentId");
    const amountParam = searchParams.get("amount");

    if (orderIdParam) setOrderId(orderIdParam);
    if (paymentIdParam) setPaymentId(paymentIdParam);
    if (amountParam) setAmount(parseFloat(amountParam));

    // Generate QR code data
    if (orderIdParam && amountParam) {
      generateQrCode(orderIdParam, amountParam);
    }

    // Start polling for payment status
    if (paymentIdParam) {
      startPolling(paymentIdParam);
    }

    return () => {
      isMountedRef.current = false;
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [searchParams]);

  const generateQrCode = (orderId: string, amount: string) => {
    // Generate QR code data (VietQR format or similar)
    // Format: payment info with order ID and amount
    const qrData = JSON.stringify({
      type: "PAYMENT",
      orderId: orderId,
      amount: parseFloat(amount),
      timestamp: Date.now(),
    });
    
    // For demo, we'll use a QR code generator API or library
    // Using a simple QR code service (you can replace with your own)
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrData)}`;
    setQrCode(qrUrl);
    setIsLoading(false);
  };

  const startPolling = (paymentId: string) => {
    // Poll every 3 seconds to check payment status
    checkIntervalRef.current = setInterval(async () => {
      if (!isMountedRef.current) return;

      try {
        const payment = await paymentService.getPaymentByOrderId(orderId || "");
        
        if (payment) {
          if (payment.status === "completed") {
            setStatus("success");
            if (checkIntervalRef.current) {
              clearInterval(checkIntervalRef.current);
            }
            
            // Check if this is a wallet deposit
            const isWalletDeposit = payment.orderId && payment.orderId.startsWith("WALLET_DEPOSIT_");
            
            if (isWalletDeposit) {
              toast({
                title: "Nạp tiền thành công",
                description: "Đã nạp tiền vào ví thành công.",
              });
              // Redirect to wallet page after 2 seconds
              setTimeout(() => {
                navigate("/wallet");
              }, 2000);
            } else {
              toast({
                title: "Thanh toán thành công",
                description: "Đơn hàng của bạn đã được xác nhận.",
              });
              // Redirect to orders page after 2 seconds
              setTimeout(() => {
                navigate("/orders");
              }, 2000);
            }
          } else if (payment.status === "failed") {
            setStatus("failed");
            if (checkIntervalRef.current) {
              clearInterval(checkIntervalRef.current);
            }
            toast({
              title: "Thanh toán thất bại",
              description: "Giao dịch không thành công. Vui lòng thử lại.",
              variant: "destructive",
            });
          }
        }
      } catch (error) {
        console.error("Error checking payment status:", error);
      }
    }, 3000);
  };

  const handleCancel = () => {
    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current);
    }
    // Check if this is a wallet deposit to redirect appropriately
    if (orderId && orderId.startsWith("WALLET_DEPOSIT_")) {
      navigate("/wallet");
    } else {
      navigate("/orders");
    }
  };

  const handleConfirmPayment = async () => {
    // Simulate payment confirmation (in real app, this would be done by scanning QR)
    try {
      if (!paymentId || !orderId) {
        throw new Error("Thiếu thông tin thanh toán");
      }

      // Simulate payment success
      // In real app, this would be handled by the payment gateway callback
      setStatus("success");
      
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }

      // Check if this is a wallet deposit
      const isWalletDeposit = orderId && orderId.startsWith("WALLET_DEPOSIT_");
      
      if (isWalletDeposit) {
        toast({
          title: "Nạp tiền thành công",
          description: "Đã nạp tiền vào ví thành công.",
        });
        setTimeout(() => {
          navigate("/wallet");
        }, 2000);
      } else {
        toast({
          title: "Thanh toán thành công",
          description: "Đơn hàng của bạn đã được xác nhận.",
        });
        setTimeout(() => {
          navigate("/orders");
        }, 2000);
      }
    } catch (error: any) {
      console.error("Error confirming payment:", error);
      toast({
        title: "Lỗi",
        description: error.message || "Không thể xác nhận thanh toán",
        variant: "destructive",
      });
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 py-8">
          <div className="container mx-auto px-4 max-w-2xl">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="h-6 w-6" />
                  Thanh toán bằng QR Pay
                </CardTitle>
                <CardDescription>
                  Quét mã QR bằng ứng dụng ngân hàng để thanh toán
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {status === "pending" && (
                  <>
                    <div className="text-center space-y-4">
                      <div className="flex justify-center">
                        {isLoading ? (
                          <div className="w-[300px] h-[300px] bg-gray-100 rounded-lg flex items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                          </div>
                        ) : qrCode ? (
                          <img
                            src={qrCode}
                            alt="QR Code"
                            className="w-[300px] h-[300px] border-4 border-gray-200 rounded-lg"
                          />
                        ) : (
                          <div className="w-[300px] h-[300px] bg-gray-100 rounded-lg flex items-center justify-center">
                            <p className="text-gray-500">Không thể tạo mã QR</p>
                          </div>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <p className="text-lg font-semibold">
                          Số tiền: {amount.toLocaleString("vi-VN")} VND
                        </p>
                        {orderId && (
                          <p className="text-sm text-muted-foreground">
                            Mã đơn hàng: {orderId}
                          </p>
                        )}
                      </div>
                      
                      <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                        <p className="text-sm text-blue-800">
                          <strong>Hướng dẫn:</strong>
                        </p>
                        <ol className="text-sm text-blue-700 mt-2 space-y-1 list-decimal list-inside">
                          <li>Mở ứng dụng ngân hàng trên điện thoại</li>
                          <li>Chọn tính năng quét QR</li>
                          <li>Quét mã QR trên màn hình</li>
                          <li>Xác nhận thanh toán trong ứng dụng</li>
                        </ol>
                      </div>
                    </div>
                    
                    <div className="flex gap-4">
                      <Button
                        variant="outline"
                        onClick={handleCancel}
                        className="flex-1"
                      >
                        Hủy
                      </Button>
                      <Button
                        onClick={handleConfirmPayment}
                        className="flex-1"
                      >
                        Đã thanh toán
                      </Button>
                    </div>
                  </>
                )}

                {status === "success" && (
                  <div className="text-center space-y-4 py-8">
                    <CheckCircle className="h-16 w-16 text-green-600 mx-auto" />
                    <h3 className="text-2xl font-semibold text-green-600">
                      Thanh toán thành công!
                    </h3>
                    <p className="text-muted-foreground">
                      Đơn hàng của bạn đã được xác nhận. Đang chuyển hướng...
                    </p>
                  </div>
                )}

                {status === "failed" && (
                  <div className="text-center space-y-4 py-8">
                    <XCircle className="h-16 w-16 text-red-600 mx-auto" />
                    <h3 className="text-2xl font-semibold text-red-600">
                      Thanh toán thất bại
                    </h3>
                    <p className="text-muted-foreground">
                      Giao dịch không thành công. Vui lòng thử lại.
                    </p>
                    <Button onClick={handleCancel} className="mt-4">
                      Quay lại
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    </AuthGuard>
  );
}

