import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { paymentService } from "@/services/paymentService";
import { orderService } from "@/services/orderService";
import { walletService } from "@/services/walletService";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export default function PaymentReturn() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [status, setStatus] = useState<"loading" | "success" | "failed">("loading");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [message, setMessage] = useState<string>("");
  const [isWalletDeposit, setIsWalletDeposit] = useState<boolean>(false);

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        const statusParam = searchParams.get("status");
        const orderIdParam = searchParams.get("orderId");
        const vnpResponseCode = searchParams.get("vnp_ResponseCode");
        const vnpTxnRef = searchParams.get("vnp_TxnRef");

        // Extract orderId properly
        let extractedOrderId = orderIdParam;
        if (!extractedOrderId && vnpTxnRef) {
          // For WALLET_DEPOSIT: WALLET_DEPOSIT_{transactionId}_{timestamp}
          // Extract: WALLET_DEPOSIT_{transactionId}
          if (vnpTxnRef.startsWith("WALLET_DEPOSIT_")) {
            const parts = vnpTxnRef.split("_");
            if (parts.length >= 3) {
              extractedOrderId = parts[0] + "_" + parts[1]; // WALLET_DEPOSIT_{transactionId}
            } else {
              extractedOrderId = vnpTxnRef; // Already correct format
            }
          } else {
            // For other orderIds, just take the first part
            extractedOrderId = vnpTxnRef.split("_")[0];
          }
        }
        
        if (extractedOrderId) {
          setOrderId(extractedOrderId);
        }

        // Check payment status
        if (statusParam === "completed" || vnpResponseCode === "00") {
          setStatus("success");
          setMessage("Thanh toán thành công! Đơn hàng của bạn đã được xác nhận.");

          // Check if this is a wallet deposit and complete it
          const checkAndCompleteWalletDeposit = async () => {
            // Check both extractedOrderId and vnpTxnRef for WALLET_DEPOSIT
            const sources = [extractedOrderId, vnpTxnRef].filter(Boolean);
            console.log("=== Checking for wallet deposit ===");
            console.log("Sources to check:", sources);
            
            for (const source of sources) {
              if (!source) continue;
              
              let orderIdToCheck = source;
              
              // If source starts with WALLET_DEPOSIT, extract transaction ID
              if (source.startsWith("WALLET_DEPOSIT_")) {
                // Format: WALLET_DEPOSIT_{transactionId} or WALLET_DEPOSIT_{transactionId}_{timestamp}
                // Split by "_" gives: ["WALLET", "DEPOSIT", "{transactionId}", "{timestamp}"]
                const parts = source.split("_");
                console.log("Split parts:", parts);
                
                if (parts.length >= 3) {
                  // Reconstruct: WALLET_DEPOSIT_{transactionId}
                  orderIdToCheck = parts[0] + "_" + parts[1] + "_" + parts[2];
                  console.log("Reconstructed orderId:", orderIdToCheck);
                } else if (parts.length === 2) {
                  // Already correct format: WALLET_DEPOSIT
                  orderIdToCheck = source;
                }
                
                // Extract transaction ID (part after "WALLET_DEPOSIT_")
                // If format is WALLET_DEPOSIT_{transactionId}_{timestamp}, take parts[2]
                // If format is WALLET_DEPOSIT_{transactionId}, take everything after "WALLET_DEPOSIT_"
                let transactionId = "";
                if (parts.length >= 3) {
                  transactionId = parts[2]; // Transaction ID is the 3rd part (index 2)
                } else {
                  transactionId = orderIdToCheck.replace("WALLET_DEPOSIT_", "");
                }
                
                console.log("Extracted transactionId:", transactionId);
                
                console.log("Found WALLET_DEPOSIT! Source:", source);
                console.log("Extracted orderId:", orderIdToCheck);
                console.log("Extracted transactionId:", transactionId);
                
                // Mark as wallet deposit
                setIsWalletDeposit(true);
                
                if (transactionId) {
                  try {
                    console.log("Calling walletService.completeDeposit with transactionId:", transactionId);
                    const result = await walletService.completeDeposit(transactionId);
                    console.log("✅ Wallet deposit completed successfully!", result);
                    
                    // Reload wallet to get updated balance
                    if (user) {
                      try {
                        const updatedWallet = await walletService.getWallet(user.id);
                        console.log("Updated wallet balance:", updatedWallet.balance);
                      } catch (walletError) {
                        console.error("Error reloading wallet:", walletError);
                      }
                    }
                    
                    toast({
                      title: "Nạp tiền thành công",
                      description: `Đã nạp ${result.amount.toLocaleString('vi-VN')} VND vào ví. Số dư mới: ${result.balanceAfter.toLocaleString('vi-VN')} VND`,
                    });
                    
                    // Trigger wallet reload event for Wallet page
                    window.dispatchEvent(new CustomEvent('wallet-deposit-completed', { 
                      detail: { balance: result.balanceAfter } 
                    }));
                    
                    // Auto redirect to wallet page after 2 seconds
                    setTimeout(() => {
                      navigate("/wallet");
                    }, 2000);
                    
                    return true; // Successfully completed
                  } catch (walletError: any) {
                    console.error("❌ Error completing wallet deposit:", walletError);
                    console.error("Error message:", walletError.message);
                    console.error("Error response:", walletError.response);
                    
                    toast({
                      title: "Cảnh báo",
                      description: walletError.message || "Nạp tiền thành công nhưng có lỗi khi cập nhật ví. Vui lòng liên hệ hỗ trợ.",
                      variant: "destructive",
                    });
                    return false;
                  }
                }
              }
            }
            
            return false;
          };

          // Verify payment with backend
          if (extractedOrderId || vnpTxnRef) {
            try {
              // First, try to complete wallet deposit if applicable
              const walletDepositCompleted = await checkAndCompleteWalletDeposit();
              
              if (!walletDepositCompleted) {
                // If not a wallet deposit, try to get payment from backend
                const orderIdToUse = extractedOrderId || (vnpTxnRef ? vnpTxnRef.split("_")[0] : null);
                
                if (orderIdToUse && !orderIdToUse.startsWith("WALLET_DEPOSIT_")) {
                  try {
                    const payment = await paymentService.getPaymentByOrderId(orderIdToUse);
                    console.log("Payment found:", payment);
                    
                    if (payment && payment.status === "completed") {
                      toast({
                        title: "Thanh toán thành công",
                        description: "Đơn hàng của bạn đã được xác nhận.",
                      });
                    }
                  } catch (paymentError) {
                    console.log("Payment not found by orderId");
                  }
                }
              }
            } catch (error: any) {
              console.error("Error in payment verification:", error);
              console.error("Error details:", error.message, error.stack);
            }
          }
        } else {
          setStatus("failed");
          setMessage(
            statusParam === "failed"
              ? "Thanh toán thất bại. Vui lòng thử lại."
              : "Giao dịch đã bị hủy hoặc thất bại."
          );
          toast({
            title: "Thanh toán thất bại",
            description: "Vui lòng thử lại hoặc chọn phương thức thanh toán khác.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error processing payment return:", error);
        setStatus("failed");
        setMessage("Có lỗi xảy ra khi xử lý thanh toán. Vui lòng liên hệ hỗ trợ.");
      }
    };

    verifyPayment();
  }, [searchParams, toast]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 py-8">
        <div className="container mx-auto px-4 max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle className="text-center">
                {status === "loading" && (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span>Đang xử lý...</span>
                  </div>
                )}
                {status === "success" && (
                  <div className="flex items-center justify-center gap-2 text-green-600">
                    <CheckCircle className="h-6 w-6" />
                    <span>Thanh toán thành công</span>
                  </div>
                )}
                {status === "failed" && (
                  <div className="flex items-center justify-center gap-2 text-red-600">
                    <XCircle className="h-6 w-6" />
                    <span>Thanh toán thất bại</span>
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-center text-muted-foreground">{message}</p>

              {orderId && (
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm">
                    <strong>Mã đơn hàng:</strong> {orderId}
                  </p>
                  {orderId.startsWith("WALLET_DEPOSIT_") && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Giao dịch nạp tiền vào ví
                    </p>
                  )}
                </div>
              )}

              <div className="flex gap-4 justify-center">
                {status === "success" && (
                  <>
                    {isWalletDeposit ? (
                      <>
                        <Button onClick={() => navigate("/wallet")}>
                          Về ví tiền
                        </Button>
                        <Button variant="outline" onClick={() => navigate("/")}>
                          Về trang chủ
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button onClick={() => navigate("/orders")}>
                          Xem đơn hàng
                        </Button>
                        <Button variant="outline" onClick={() => navigate("/")}>
                          Về trang chủ
                        </Button>
                      </>
                    )}
                  </>
                )}
                {status === "failed" && (
                  <>
                    <Button onClick={() => navigate("/checkout")}>
                      Thử lại
                    </Button>
                    <Button variant="outline" onClick={() => navigate("/orders")}>
                      Xem đơn hàng
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}

