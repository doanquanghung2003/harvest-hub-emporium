import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { VoucherCard } from "./VoucherCard";
import { VoucherInput } from "./VoucherInput";
import { voucherService, type Voucher, type UserVoucher, type VoucherEligibilityResponse } from "@/services/voucherService";
import { Ticket, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface VoucherSelectorProps {
  userId: string;
  orderAmount: number;
  onVoucherSelected?: (code: string, discount: number) => void;
  currentVoucherCode?: string;
  disabled?: boolean;
}

export const VoucherSelector = ({
  userId,
  orderAmount,
  onVoucherSelected,
  currentVoucherCode,
  disabled = false,
}: VoucherSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [myVouchersWithEligibility, setMyVouchersWithEligibility] = useState<VoucherEligibilityResponse[]>([]);
  const [eligibleVouchers, setEligibleVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCode, setSelectedCode] = useState<string | undefined>(currentVoucherCode);
  const { toast } = useToast();

  const loadVouchers = async () => {
    setLoading(true);
    try {
      // Load user's vouchers with eligibility info
      const vouchersWithEligibility = await voucherService.getMyVouchersForCart(userId, orderAmount);
      setMyVouchersWithEligibility(vouchersWithEligibility);

      // Load eligible vouchers (platform vouchers)
      const eligible = await voucherService.getEligibleVouchers(userId, orderAmount);
      setEligibleVouchers(eligible);
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: "Không thể tải danh sách voucher",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadVouchers();
    }
  }, [open, userId, orderAmount]);

  const handleVoucherSelect = async (voucher: Voucher | UserVoucher) => {
    const code = 'code' in voucher ? voucher.code : voucher.voucherCode;
    
    // Check if voucher is eligible from our list
    const eligibilityInfo = myVouchersWithEligibility.find(
      item => item.userVoucher.voucherCode === code
    );
    
    if (eligibilityInfo && !eligibilityInfo.eligible) {
      toast({
        title: "Không thể áp dụng",
        description: eligibilityInfo.reason || "Voucher không đủ điều kiện",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Use discountAmount from eligibility info if available, otherwise calculate
      const discount = eligibilityInfo?.discountAmount ?? 
        await voucherService.calculateDiscount(code, orderAmount);
      
      if (discount <= 0) {
        toast({
          title: "Không thể áp dụng",
          description: "Voucher không thể áp dụng cho đơn hàng này",
          variant: "destructive",
        });
        return;
      }
      
      setSelectedCode(code);
      onVoucherSelected?.(code, discount);
      setOpen(false);
      toast({
        title: "Thành công",
        description: `Đã áp dụng voucher ${code}`,
      });
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error?.message || "Không thể áp dụng voucher",
        variant: "destructive",
      });
    }
  };

  const handleVoucherApplied = (code: string, discount: number) => {
    setSelectedCode(code);
    onVoucherSelected?.(code, discount);
    setOpen(false);
  };

  const handleVoucherRemoved = () => {
    setSelectedCode(undefined);
    onVoucherSelected?.("", 0);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" disabled={disabled} className="w-full justify-start">
          <Ticket className="w-4 h-4 mr-2" />
          {selectedCode ? `Voucher: ${selectedCode}` : "Chọn hoặc nhập mã voucher"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Chọn Voucher</DialogTitle>
          <DialogDescription>
            Chọn voucher từ danh sách hoặc nhập mã voucher
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Voucher Input */}
          <div>
            <h3 className="text-sm font-semibold mb-2">Nhập mã voucher</h3>
            <VoucherInput
              onVoucherApplied={handleVoucherApplied}
              onVoucherRemoved={handleVoucherRemoved}
              currentVoucherCode={selectedCode}
              orderAmount={orderAmount}
              userId={userId}
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : (
            <>
              {/* My Vouchers */}
              {myVouchersWithEligibility.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-3">Voucher của tôi</h3>
                  <div className="grid gap-3">
                    {myVouchersWithEligibility.map((item) => (
                      <VoucherCard
                        key={item.userVoucher.id}
                        userVoucher={item.userVoucher}
                        voucher={item.voucher}
                        onSelect={handleVoucherSelect}
                        showSelectButton={true}
                        isSelected={selectedCode === item.userVoucher.voucherCode}
                        eligible={item.eligible}
                        reason={item.reason}
                        discountAmount={item.discountAmount}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Eligible Vouchers */}
              {eligibleVouchers.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-3">Voucher có thể dùng</h3>
                  <div className="grid gap-3">
                    {eligibleVouchers.map((v) => (
                      <VoucherCard
                        key={v.id}
                        voucher={v}
                        onSelect={handleVoucherSelect}
                        showSelectButton={true}
                        isSelected={selectedCode === v.code}
                      />
                    ))}
                  </div>
                </div>
              )}

              {myVouchersWithEligibility.length === 0 && eligibleVouchers.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Không có voucher nào khả dụng
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

