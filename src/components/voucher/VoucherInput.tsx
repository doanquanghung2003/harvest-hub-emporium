import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Ticket, X, Check, Loader2 } from "lucide-react";
import { voucherService } from "@/services/voucherService";
import { useToast } from "@/hooks/use-toast";

interface VoucherInputProps {
  onVoucherApplied?: (code: string, discount: number) => void;
  onVoucherRemoved?: () => void;
  currentVoucherCode?: string;
  orderAmount: number;
  userId: string;
  disabled?: boolean;
}

export const VoucherInput = ({
  onVoucherApplied,
  onVoucherRemoved,
  currentVoucherCode,
  orderAmount,
  userId,
  disabled = false,
}: VoucherInputProps) => {
  const [code, setCode] = useState(currentVoucherCode || "");
  const [isValidating, setIsValidating] = useState(false);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [discount, setDiscount] = useState(0);
  const { toast } = useToast();

  const handleValidate = async () => {
    if (!code.trim()) {
      toast({
        title: "Lỗi",
        description: "Vui lòng nhập mã voucher",
        variant: "destructive",
      });
      return;
    }

    setIsValidating(true);
    try {
      const valid = await voucherService.validateVoucher(
        code.trim().toUpperCase(),
        userId,
        orderAmount
      );

      if (valid) {
        const discountAmount = await voucherService.calculateDiscount(
          code.trim().toUpperCase(),
          orderAmount
        );
        setIsValid(true);
        setDiscount(discountAmount);
        onVoucherApplied?.(code.trim().toUpperCase(), discountAmount);
        toast({
          title: "Thành công",
          description: `Voucher hợp lệ! Bạn được giảm ${discountAmount.toLocaleString()}đ`,
        });
      } else {
        setIsValid(false);
        setDiscount(0);
        toast({
          title: "Lỗi",
          description: "Mã voucher không hợp lệ hoặc không thể áp dụng",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      setIsValid(false);
      setDiscount(0);
      toast({
        title: "Lỗi",
        description: error.message || "Không thể kiểm tra voucher",
        variant: "destructive",
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleRemove = () => {
    setCode("");
    setIsValid(null);
    setDiscount(0);
    onVoucherRemoved?.();
    toast({
      title: "Đã xóa voucher",
      description: "Voucher đã được xóa khỏi đơn hàng",
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Ticket className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Nhập mã voucher"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              setIsValid(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !isValidating) {
                handleValidate();
              }
            }}
            disabled={disabled || isValidating}
            className="pl-10"
          />
        </div>
        {currentVoucherCode && isValid ? (
          <Button
            variant="outline"
            size="icon"
            onClick={handleRemove}
            disabled={disabled}
          >
            <X className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            onClick={handleValidate}
            disabled={disabled || isValidating || !code.trim()}
          >
            {isValidating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Áp dụng"
            )}
          </Button>
        )}
      </div>

      {isValid && discount > 0 && (
        <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded-md">
          <Check className="w-4 h-4 text-green-600" />
          <span className="text-sm text-green-700 dark:text-green-400">
            Voucher hợp lệ! Bạn được giảm{" "}
            <span className="font-semibold">
              {discount.toLocaleString()}đ
            </span>
          </span>
        </div>
      )}

      {isValid === false && (
        <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-900/20 rounded-md">
          <X className="w-4 h-4 text-red-600" />
          <span className="text-sm text-red-700 dark:text-red-400">
            Mã voucher không hợp lệ
          </span>
        </div>
      )}

      {currentVoucherCode && isValid && (
        <Badge variant="secondary" className="w-fit">
          Mã: {currentVoucherCode}
        </Badge>
      )}
    </div>
  );
};

