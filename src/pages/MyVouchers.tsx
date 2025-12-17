import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Ticket, Calendar, Loader2 } from "lucide-react";
import { AuthGuard } from "@/components/AuthGuard";
import { voucherService, type UserVoucher } from "@/services/voucherService";
import { useAuth } from "@/hooks/useAuth";
import { VoucherCard } from "@/components/voucher/VoucherCard";
import { format } from "date-fns";

const MyVouchers = () => {
  const { user } = useAuth();
  const [vouchers, setVouchers] = useState<UserVoucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("active");

  useEffect(() => {
    const loadVouchers = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const data = await voucherService.getMyVouchers(user.id);
        setVouchers(data);
      } catch (error) {
        console.error("Failed to load vouchers", error);
      } finally {
        setLoading(false);
      }
    };
    loadVouchers();
  }, [user]);

  const activeVouchers = vouchers.filter(
    (v) => !v.isUsed && new Date(v.expiresAt) >= new Date()
  );
  const usedVouchers = vouchers.filter((v) => v.isUsed);
  const expiredVouchers = vouchers.filter(
    (v) => !v.isUsed && new Date(v.expiresAt) < new Date()
  );

  if (loading) {
    return (
      <AuthGuard>
        <div className="min-h-screen flex flex-col">
          <Header />
          <main className="flex-1 py-8">
            <div className="container mx-auto px-4">
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin" />
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
          <div className="container mx-auto px-4">
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2">Voucher của tôi</h1>
              <p className="text-muted-foreground">
                Quản lý và sử dụng voucher của bạn
              </p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="active">
                  Có thể dùng ({activeVouchers.length})
                </TabsTrigger>
                <TabsTrigger value="used">
                  Đã sử dụng ({usedVouchers.length})
                </TabsTrigger>
                <TabsTrigger value="expired">
                  Hết hạn ({expiredVouchers.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="active" className="mt-6">
                {activeVouchers.length === 0 ? (
                  <Card>
                    <CardContent className="py-16 text-center">
                      <Ticket className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground">
                        Bạn chưa có voucher nào có thể sử dụng
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {activeVouchers.map((voucher) => (
                      <VoucherCard
                        key={voucher.id}
                        userVoucher={voucher}
                        showSelectButton={false}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="used" className="mt-6">
                {usedVouchers.length === 0 ? (
                  <Card>
                    <CardContent className="py-16 text-center">
                      <Ticket className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground">
                        Bạn chưa sử dụng voucher nào
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {usedVouchers.map((voucher) => (
                      <VoucherCard
                        key={voucher.id}
                        userVoucher={voucher}
                        showSelectButton={false}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="expired" className="mt-6">
                {expiredVouchers.length === 0 ? (
                  <Card>
                    <CardContent className="py-16 text-center">
                      <Ticket className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground">
                        Không có voucher nào đã hết hạn
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {expiredVouchers.map((voucher) => (
                      <VoucherCard
                        key={voucher.id}
                        userVoucher={voucher}
                        showSelectButton={false}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </main>
        <Footer />
      </div>
    </AuthGuard>
  );
};

export default MyVouchers;

