import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sprout, Mail, Phone, MapPin, Facebook, Twitter, Instagram, Youtube } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-muted mt-auto">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Sprout className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold text-primary">AgriTrade</span>
            </div>
            <p className="text-muted-foreground">
              Kết nối nông dân và người tiêu dùng để có sản phẩm nông nghiệp tươi ngon nhất. 
              Hỗ trợ nông nghiệp bền vững và cộng đồng địa phương.
            </p>
            <div className="flex space-x-4">
              <Button variant="ghost" size="icon">
                <Facebook className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon">
                <Twitter className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon">
                <Instagram className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon">
                <Youtube className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Liên kết nhanh</h3>
            <div className="space-y-2">
              <Link to="/about" className="block text-muted-foreground hover:text-primary transition-colors">
                Về chúng tôi
              </Link>
              <Link to="/how-it-works" className="block text-muted-foreground hover:text-primary transition-colors">
                Cách hoạt động
              </Link>
              <Link to="/sell" className="block text-muted-foreground hover:text-primary transition-colors">
                Bán với chúng tôi
              </Link>
              <Link to="/sustainability" className="block text-muted-foreground hover:text-primary transition-colors">
                Tính bền vững
              </Link>
              <Link to="/blog" className="block text-muted-foreground hover:text-primary transition-colors">
                Blog
              </Link>
            </div>
          </div>

          {/* Customer Service */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Dịch vụ khách hàng</h3>
            <div className="space-y-2">
              <Link to="/help" className="block text-muted-foreground hover:text-primary transition-colors">
                Trung tâm trợ giúp
              </Link>
              <Link to="/shipping" className="block text-muted-foreground hover:text-primary transition-colors">
                Thông tin vận chuyển
              </Link>
              <Link to="/returns" className="block text-muted-foreground hover:text-primary transition-colors">
                Đổi trả & Hoàn tiền
              </Link>
              <Link to="/contact" className="block text-muted-foreground hover:text-primary transition-colors">
                Liên hệ chúng tôi
              </Link>
              <Link to="/track-order" className="block text-muted-foreground hover:text-primary transition-colors">
                Theo dõi đơn hàng
              </Link>
            </div>
          </div>

          {/* Newsletter & Contact */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Kết nối với chúng tôi</h3>
            <p className="text-muted-foreground text-sm">
              Đăng ký để nhận cập nhật về sản phẩm tươi và ưu đãi đặc biệt.
            </p>
            <div className="space-y-2">
              <Input
                type="email"
                placeholder="Nhập email của bạn"
                className="w-full"
              />
              <Button className="w-full">
                <Mail className="h-4 w-4 mr-2" />
                Đăng ký
              </Button>
            </div>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center space-x-2">
                <Phone className="h-4 w-4" />
                <span>+84 396474848</span>
              </div>
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4" />
                <span>support@agritrade.com</span>
              </div>
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4" />
                <span>Bắc Từ Liêm - Hà Nội</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-border mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-muted-foreground text-sm">
            © 2025 AgriTrade. Bản quyền thuộc về AgriTrade - Hưng JiKa.
          </p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <Link to="/privacy" className="text-muted-foreground hover:text-primary text-sm transition-colors">
              Chính sách bảo mật
            </Link>
            <Link to="/terms" className="text-muted-foreground hover:text-primary text-sm transition-colors">
              Điều khoản dịch vụ
            </Link>
            <Link to="/cookies" className="text-muted-foreground hover:text-primary text-sm transition-colors">
              Chính sách cookie
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}