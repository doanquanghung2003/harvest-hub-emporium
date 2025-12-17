import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Ticket, Calendar, Percent, DollarSign, Truck } from "lucide-react";
import { voucherService, type Voucher, type UserVoucher } from "@/services/voucherService";
import { format } from "date-fns";

interface VoucherCardProps {
  voucher?: Voucher;
  userVoucher?: UserVoucher;
  onSelect?: (voucher: Voucher | UserVoucher) => void;
  showSelectButton?: boolean;
  isSelected?: boolean;
  eligible?: boolean; // Whether voucher is eligible for current order
  reason?: string; // Reason if not eligible
  discountAmount?: number; // Calculated discount amount
}

export const VoucherCard = ({ 
  voucher, 
  userVoucher, 
  onSelect, 
  showSelectButton = false,
  isSelected = false,
  eligible = true, // Default to eligible if not specified
  reason,
  discountAmount
}: VoucherCardProps) => {
  // If we have a voucher, use it directly
  // If we have userVoucher, we'll need to fetch voucher details or use basic info
  const displayVoucher = voucher;

  if (!displayVoucher && !userVoucher) return null;

  const isExpired = userVoucher 
    ? new Date(userVoucher.expiresAt) < new Date() 
    : displayVoucher ? new Date(displayVoucher.endDate) < new Date() : false;
  
  const isUsed = userVoucher?.isUsed || false;

  const getDiscountText = () => {
    if (!displayVoucher) return userVoucher?.voucherCode || 'Voucher';
    if (displayVoucher.type === 'percentage') {
      return `Giảm ${displayVoucher.value}%`;
    } else if (displayVoucher.type === 'fixed_amount') {
      return `Giảm ${displayVoucher.value.toLocaleString()}đ`;
    } else if (displayVoucher.type === 'free_shipping') {
      return 'Miễn phí vận chuyển';
    }
    return '';
  };

  const getTypeIcon = () => {
    if (!displayVoucher) return <Ticket className="w-4 h-4" />;
    if (displayVoucher.type === 'percentage') return <Percent className="w-4 h-4" />;
    if (displayVoucher.type === 'fixed_amount') return <DollarSign className="w-4 h-4" />;
    if (displayVoucher.type === 'free_shipping') return <Truck className="w-4 h-4" />;
    return <Ticket className="w-4 h-4" />;
  };

  return (
    <Card className={`relative ${isSelected ? 'ring-2 ring-primary' : ''} ${isExpired || isUsed ? 'opacity-60' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              {getTypeIcon()}
            </div>
            <div>
              <CardTitle className="text-lg">
                {displayVoucher?.name || userVoucher?.voucherCode || 'Voucher'}
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                {displayVoucher?.description || `Mã: ${userVoucher?.voucherCode || displayVoucher?.code || ''}`}
              </CardDescription>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            {isExpired && <Badge variant="destructive">Hết hạn</Badge>}
            {isUsed && !isExpired && <Badge variant="secondary">Đã sử dụng</Badge>}
            {!isExpired && !isUsed && eligible && <Badge variant="default" className="bg-green-500">Có thể dùng</Badge>}
            {!isExpired && !isUsed && !eligible && <Badge variant="secondary">Không đủ điều kiện</Badge>}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Giảm giá:</span>
            <span className="font-semibold text-primary">
              {discountAmount !== undefined && discountAmount > 0 
                ? `${discountAmount.toLocaleString()}đ`
                : getDiscountText()}
            </span>
          </div>
          
          {displayVoucher && displayVoucher.minOrderAmount > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Đơn tối thiểu:</span>
              <span className={`text-sm font-medium ${!eligible ? 'text-red-500' : ''}`}>
                {displayVoucher.minOrderAmount.toLocaleString()}đ
              </span>
            </div>
          )}

          {!eligible && reason && (
            <div className="p-2 bg-red-50 border border-red-200 rounded-md">
              <p className="text-xs text-red-600">{reason}</p>
            </div>
          )}

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="w-3 h-3" />
            <span>
              HSD: {format(
                new Date(displayVoucher?.endDate || userVoucher?.expiresAt || new Date()), 
                'dd/MM/yyyy'
              )}
            </span>
          </div>

          {showSelectButton && onSelect && !isExpired && !isUsed && (
            <Button 
              className="w-full mt-2" 
              size="sm"
              onClick={() => {
                if (voucher) onSelect(voucher);
                else if (userVoucher) onSelect(userVoucher);
              }}
              variant={isSelected ? "default" : "outline"}
              disabled={!eligible}
            >
              {isSelected ? 'Đã chọn' : eligible ? 'Chọn voucher' : 'Không đủ điều kiện'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

