import { useState, useEffect } from "react";
import { SellerGuard } from "@/components/SellerGuard";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { VoucherForm } from "@/components/voucher/VoucherForm";
import { voucherService, type Voucher } from "@/services/voucherService";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Plus, Edit, Trash2, TrendingUp, Tag, Calendar, Users } from "lucide-react";
import { format } from "date-fns";

const SellerVoucherManagement = () => {
  const { user } = useAuth();
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [statistics, setStatistics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState<Voucher | undefined>();
  const [shopId, setShopId] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    // Get shop ID from user or seller info
    // For now, using a placeholder - you may need to fetch from seller service
    if (user) {
      // Assuming seller has shopId in their profile
      // You may need to adjust this based on your seller model
      setShopId(user.id); // Placeholder - replace with actual shopId
      loadVouchers();
      loadStatistics();
    }
  }, [user]);

  const loadVouchers = async () => {
    if (!shopId) return;
    try {
      setLoading(true);
      const data = await voucherService.getShopVouchers(shopId);
      setVouchers(data);
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Không thể tải danh sách voucher",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    if (!shopId) return;
    try {
      const stats = await voucherService.getShopVoucherStatistics(shopId);
      setStatistics(stats);
    } catch (error) {
      console.error("Failed to load statistics", error);
    }
  };

  const handleCreate = async (data: Partial<Voucher>) => {
    if (!shopId) return;
    try {
      await voucherService.createShopVoucher(shopId, data);
      toast({
        title: "Thành công",
        description: "Đã tạo voucher",
      });
      setShowForm(false);
      loadVouchers();
      loadStatistics();
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể tạo voucher",
        variant: "destructive",
      });
    }
  };

  const handleUpdate = async (data: Partial<Voucher>) => {
    if (!editingVoucher || !shopId) return;
    try {
      await voucherService.updateShopVoucher(editingVoucher.id, shopId, data);
      toast({
        title: "Thành công",
        description: "Đã cập nhật voucher",
      });
      setShowForm(false);
      setEditingVoucher(undefined);
      loadVouchers();
      loadStatistics();
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể cập nhật voucher",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!shopId) return;
    if (!confirm("Bạn có chắc muốn xóa voucher này?")) return;
    try {
      await voucherService.deleteShopVoucher(id, shopId);
      toast({
        title: "Thành công",
        description: "Đã xóa voucher",
      });
      loadVouchers();
      loadStatistics();
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể xóa voucher",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="default">Hoạt động</Badge>;
      case "inactive":
        return <Badge variant="secondary">Không hoạt động</Badge>;
      case "expired":
        return <Badge variant="outline">Hết hạn</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "percentage":
        return "Giảm %";
      case "fixed_amount":
        return "Giảm tiền";
      case "free_shipping":
        return "Miễn phí ship";
      default:
        return type;
    }
  };

  if (!shopId) {
    return (
      <SellerGuard>
        <div className="min-h-screen flex flex-col">
          <Header />
          <main className="flex-1 py-8">
            <div className="container mx-auto px-4">
              <Card>
                <CardContent className="py-16 text-center">
                  <p className="text-muted-foreground">
                    Vui lòng đăng ký shop trước khi tạo voucher
                  </p>
                </CardContent>
              </Card>
            </div>
          </main>
          <Footer />
        </div>
      </SellerGuard>
    );
  }

  return (
    <SellerGuard>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 py-8">
          <div className="container mx-auto px-4">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2">Quản lý Voucher Shop</h1>
                <p className="text-muted-foreground">Quản lý voucher cho shop của bạn</p>
              </div>
              <Dialog open={showForm} onOpenChange={setShowForm}>
                <DialogTrigger asChild>
                  <Button onClick={() => setEditingVoucher(undefined)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Tạo voucher
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingVoucher ? "Sửa voucher" : "Tạo voucher mới"}</DialogTitle>
                    <DialogDescription>
                      {editingVoucher ? "Cập nhật thông tin voucher" : "Tạo voucher cho shop của bạn"}
                    </DialogDescription>
                  </DialogHeader>
                  <VoucherForm
                    voucher={editingVoucher}
                    onSubmit={editingVoucher ? handleUpdate : handleCreate}
                    onCancel={() => {
                      setShowForm(false);
                      setEditingVoucher(undefined);
                    }}
                    isShopVoucher={true}
                    shopId={shopId}
                  />
                </DialogContent>
              </Dialog>
            </div>

            {/* Statistics */}
            {statistics && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Tổng voucher</CardTitle>
                    <Tag className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{statistics.totalVouchers || 0}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Đang hoạt động</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{statistics.activeVouchers || 0}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Tổng lượt dùng</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{statistics.totalUsage || 0}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Tổng giảm giá</CardTitle>
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {(statistics.totalDiscountGiven || 0).toLocaleString()}đ
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Vouchers Table */}
            <Card>
              <CardHeader>
                <CardTitle>Danh sách voucher</CardTitle>
                <CardDescription>Voucher của shop bạn</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">Đang tải...</div>
                ) : vouchers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">Chưa có voucher nào</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mã</TableHead>
                        <TableHead>Tên</TableHead>
                        <TableHead>Loại</TableHead>
                        <TableHead>Giá trị</TableHead>
                        <TableHead>Đã dùng</TableHead>
                        <TableHead>HSD</TableHead>
                        <TableHead>Trạng thái</TableHead>
                        <TableHead>Thao tác</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vouchers.map((voucher) => (
                        <TableRow key={voucher.id}>
                          <TableCell className="font-mono">{voucher.code}</TableCell>
                          <TableCell>{voucher.name}</TableCell>
                          <TableCell>{getTypeLabel(voucher.type)}</TableCell>
                          <TableCell>
                            {voucher.type === "percentage"
                              ? `${voucher.value}%`
                              : voucher.type === "fixed_amount"
                              ? `${voucher.value.toLocaleString()}đ`
                              : "Miễn phí ship"}
                          </TableCell>
                          <TableCell>
                            {voucher.usageLimit === -1
                              ? `${voucher.usedCount}`
                              : `${voucher.usedCount}/${voucher.usageLimit}`}
                          </TableCell>
                          <TableCell>{format(new Date(voucher.endDate), "dd/MM/yyyy")}</TableCell>
                          <TableCell>{getStatusBadge(voucher.status)}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingVoucher(voucher);
                                  setShowForm(true);
                                }}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(voucher.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    </SellerGuard>
  );
};

export default SellerVoucherManagement;

