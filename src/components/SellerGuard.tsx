import { ReactNode, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { AuthGuard } from '@/components/AuthGuard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Store, Lock, AlertTriangle, Clock, XCircle } from 'lucide-react';

interface SellerGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface SellerInfo {
  isSeller: boolean;
  seller?: {
    id: string;
    status: string;
    businessName?: string;
  };
  status?: string;
}

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || '';

export function SellerGuard({ children, fallback }: SellerGuardProps) {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [sellerInfo, setSellerInfo] = useState<SellerInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkSellerStatus = async () => {
      if (!user || !isAuthenticated) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const response = await fetch(`${API_BASE_URL}/api/sellers/check/${user.id}`, {
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          setSellerInfo(data);
        } else {
          setSellerInfo({ isSeller: false });
        }
      } catch (error) {
        console.error('Error checking seller status:', error);
        setSellerInfo({ isSeller: false });
      } finally {
        setIsLoading(false);
      }
    };

    if (!authLoading) {
      checkSellerStatus();
    }
  }, [user, isAuthenticated, authLoading]);

  // Đợi auth loading xong
  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Đang kiểm tra quyền truy cập...</p>
        </div>
      </div>
    );
  }

  // Kiểm tra đăng nhập trước
  if (!isAuthenticated || !user) {
    return <AuthGuard>{children}</AuthGuard>;
  }

  // Kiểm tra user có phải seller không
  if (!sellerInfo || !sellerInfo.isSeller) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
              <Store className="h-8 w-8 text-orange-600" />
            </div>
            <CardTitle>Chưa đăng ký bán hàng</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Bạn cần đăng ký tài khoản bán hàng để truy cập trang này.
            </p>
            <div className="space-y-2">
              <Button 
                onClick={() => navigate('/sell')} 
                className="w-full"
              >
                <Store className="h-4 w-4 mr-2" />
                Đăng Ký Bán Hàng
              </Button>
              <Button 
                variant="outline" 
                onClick={() => navigate('/')} 
                className="w-full"
              >
                Về Trang Chủ
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Kiểm tra trạng thái seller
  const sellerStatus = sellerInfo.seller?.status || sellerInfo.status || '';
  const normalizedStatus = sellerStatus.toLowerCase();

  // Chỉ cho phép truy cập nếu status là "active"
  if (normalizedStatus !== 'active') {
    let statusMessage = '';
    let statusIcon = <Clock className="h-8 w-8 text-yellow-600" />;
    let statusTitle = 'Đang chờ duyệt';
    let statusDescription = '';

    if (normalizedStatus === 'pending') {
      statusMessage = 'Tài khoản bán hàng của bạn đang chờ được duyệt bởi quản trị viên.';
      statusDescription = 'Vui lòng chờ quản trị viên xem xét và duyệt đơn đăng ký của bạn.';
    } else if (normalizedStatus === 'rejected') {
      statusMessage = 'Đơn đăng ký bán hàng của bạn đã bị từ chối.';
      statusDescription = 'Vui lòng liên hệ quản trị viên để biết thêm chi tiết.';
      statusIcon = <XCircle className="h-8 w-8 text-red-600" />;
      statusTitle = 'Đơn đăng ký bị từ chối';
    } else if (normalizedStatus === 'suspended' || normalizedStatus === 'banned') {
      statusMessage = 'Tài khoản bán hàng của bạn đã bị tạm ngưng hoặc cấm.';
      statusDescription = 'Vui lòng liên hệ quản trị viên để được hỗ trợ.';
      statusIcon = <AlertTriangle className="h-8 w-8 text-red-600" />;
      statusTitle = 'Tài khoản bị tạm ngưng';
    } else {
      statusMessage = 'Tài khoản bán hàng của bạn chưa được kích hoạt.';
      statusDescription = 'Vui lòng chờ quản trị viên duyệt đơn đăng ký của bạn.';
    }

    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center">
              {statusIcon}
            </div>
            <CardTitle className={normalizedStatus === 'rejected' || normalizedStatus === 'suspended' || normalizedStatus === 'banned' ? 'text-red-600' : ''}>
              {statusTitle}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              {statusMessage}
            </p>
            {statusDescription && (
              <p className="text-sm text-muted-foreground">
                {statusDescription}
              </p>
            )}
            {sellerInfo.seller?.businessName && (
              <p className="text-sm font-medium">
                Tên shop: {sellerInfo.seller.businessName}
              </p>
            )}
            <div className="space-y-2">
              <Button 
                variant="outline" 
                onClick={() => navigate('/')} 
                className="w-full"
              >
                Về Trang Chủ
              </Button>
              <Button 
                variant="outline" 
                onClick={() => navigate('/profile')} 
                className="w-full"
              >
                Xem Hồ Sơ
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Seller đã được duyệt (status = active), cho phép truy cập
  return <>{children}</>;
}

