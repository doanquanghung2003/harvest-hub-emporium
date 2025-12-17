import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { type Voucher } from "@/services/voucherService";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoucherFormProps {
  voucher?: Voucher;
  onSubmit: (data: Partial<Voucher>) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  isShopVoucher?: boolean;
  shopId?: string;
}

export const VoucherForm = ({
  voucher,
  onSubmit,
  onCancel,
  isLoading = false,
  isShopVoucher = false,
  shopId,
}: VoucherFormProps) => {
  const [formData, setFormData] = useState<Partial<Voucher>>({
    code: "",
    name: "",
    description: "",
    type: "percentage",
    value: 0,
    minOrderAmount: 0,
    maxDiscountAmount: 0,
    usageLimit: -1,
    maxUsagePerUser: -1,
    isStackable: false,
    status: "active",
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
    membershipType: "",
  });

  const [startDate, setStartDate] = useState<Date | undefined>(
    voucher?.startDate ? new Date(voucher.startDate) : new Date()
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    voucher?.endDate ? new Date(voucher.endDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  );

  useEffect(() => {
    if (voucher) {
      setFormData({
        ...voucher,
        startDate: voucher.startDate,
        endDate: voucher.endDate,
      });
      setStartDate(new Date(voucher.startDate));
      setEndDate(new Date(voucher.endDate));
    }
  }, [voucher]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      startDate: startDate?.toISOString(),
      endDate: endDate?.toISOString(),
      shopId: isShopVoucher ? shopId : null,
      membershipType: formData.membershipType === "ALL" || !formData.membershipType ? undefined : formData.membershipType,
    };
    await onSubmit(submitData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Thông tin cơ bản</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="code">Mã voucher *</Label>
              <Input
                id="code"
                value={formData.code || ""}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="VOUCHER123"
                required
                disabled={!!voucher} // Cannot change code after creation
              />
            </div>
            <div>
              <Label htmlFor="name">Tên voucher *</Label>
              <Input
                id="name"
                value={formData.name || ""}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Giảm giá 10%"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Mô tả</Label>
            <Textarea
              id="description"
              value={formData.description || ""}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Mô tả voucher..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="type">Loại voucher *</Label>
              <Select
                value={formData.type || "percentage"}
                onValueChange={(value) => setFormData({ ...formData, type: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Giảm theo phần trăm</SelectItem>
                  <SelectItem value="fixed_amount">Giảm số tiền cố định</SelectItem>
                  <SelectItem value="free_shipping">Miễn phí vận chuyển</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="status">Trạng thái *</Label>
              <Select
                value={formData.status || "active"}
                onValueChange={(value) => setFormData({ ...formData, status: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Hoạt động</SelectItem>
                  <SelectItem value="inactive">Không hoạt động</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Giá trị và điều kiện</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="value">
                Giá trị *{" "}
                {formData.type === "percentage" && "(%)"}
                {formData.type === "fixed_amount" && "(VND)"}
              </Label>
              <Input
                id="value"
                type="number"
                value={formData.value || 0}
                onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })}
                required
                min={0}
                step={formData.type === "percentage" ? 1 : 1000}
              />
            </div>

            <div>
              <Label htmlFor="minOrderAmount">Đơn tối thiểu (VND)</Label>
              <Input
                id="minOrderAmount"
                type="number"
                value={formData.minOrderAmount || 0}
                onChange={(e) => setFormData({ ...formData, minOrderAmount: parseFloat(e.target.value) || 0 })}
                min={0}
                step={1000}
              />
            </div>
          </div>

          {formData.type === "percentage" && (
            <div>
              <Label htmlFor="maxDiscountAmount">Giảm tối đa (VND)</Label>
              <Input
                id="maxDiscountAmount"
                type="number"
                value={formData.maxDiscountAmount || 0}
                onChange={(e) => setFormData({ ...formData, maxDiscountAmount: parseFloat(e.target.value) || 0 })}
                min={0}
                step={1000}
                placeholder="0 = không giới hạn"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="usageLimit">Giới hạn sử dụng</Label>
              <Input
                id="usageLimit"
                type="number"
                value={formData.usageLimit === -1 ? "" : formData.usageLimit}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    usageLimit: e.target.value === "" ? -1 : parseInt(e.target.value) || -1,
                  })
                }
                placeholder="-1 = không giới hạn"
                min={-1}
              />
            </div>

            <div>
              <Label htmlFor="maxUsagePerUser">Số lần/người dùng</Label>
              <Input
                id="maxUsagePerUser"
                type="number"
                value={formData.maxUsagePerUser === -1 ? "" : formData.maxUsagePerUser}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    maxUsagePerUser: e.target.value === "" ? -1 : parseInt(e.target.value) || -1,
                  })
                }
                placeholder="-1 = không giới hạn"
                min={-1}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Thời gian hiệu lực</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Ngày bắt đầu *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "dd/MM/yyyy") : "Chọn ngày"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label>Ngày kết thúc *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "dd/MM/yyyy") : "Chọn ngày"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                    disabled={(date) => startDate ? date < startDate : false}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tùy chọn nâng cao</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isStackable"
              checked={formData.isStackable || false}
              onChange={(e) => setFormData({ ...formData, isStackable: e.target.checked })}
              className="rounded"
            />
            <Label htmlFor="isStackable">Có thể kết hợp với voucher khác</Label>
          </div>

          <div>
            <Label htmlFor="membershipType">Yêu cầu VIP tier</Label>
            <Select
              value={formData.membershipType || "ALL"}
              onValueChange={(value) => setFormData({ ...formData, membershipType: value === "ALL" ? undefined : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Tất cả user" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả user</SelectItem>
                <SelectItem value="VIP1">VIP1 trở lên</SelectItem>
                <SelectItem value="VIP2">VIP2 trở lên</SelectItem>
                <SelectItem value="VIP3">VIP3</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Hủy
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Đang lưu..." : voucher ? "Cập nhật" : "Tạo voucher"}
        </Button>
      </div>
    </form>
  );
};

