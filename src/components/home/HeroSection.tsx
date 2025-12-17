import { Button } from "@/components/ui/button";
import { ArrowRight, Truck, Shield, Leaf } from "lucide-react";
import { Link } from "react-router-dom";

export function HeroSection() {
  return (
    <section className="relative bg-gradient-to-br from-primary/5 to-accent/5 py-20">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left side - Content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl md:text-6xl font-bold text-foreground leading-tight">
                Tươi ngon từ
                <span className="text-primary block">Nông trại đến bàn ăn</span>
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed">
                Kết nối trực tiếp với nông dân địa phương và nhận sản phẩm tươi ngon nhất, 
                ngũ cốc và nông sản được giao tận nhà.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="text-lg px-8">
                <Link to="/marketplace" className="flex items-center">
                  Mua sắm ngay
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="text-lg px-8">
                <Link to="/sell">
                  Trở thành người bán
                </Link>
              </Button>
            </div>

            {/* Features */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8">
              <div className="flex items-center space-x-3">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <Truck className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Giao hàng nhanh</h3>
                  <p className="text-sm text-muted-foreground">Giao hàng trong ngày</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Chất lượng đảm bảo</h3>
                  <p className="text-sm text-muted-foreground">100% tươi ngon</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <Leaf className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Sản phẩm hữu cơ</h3>
                  <p className="text-sm text-muted-foreground">Nông nghiệp bền vững</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right side - Hero Image/Illustration */}
          <div className="relative">
            <div className="bg-gradient-to-br from-primary to-accent rounded-2xl p-8 text-white">
              <div className="space-y-6">
                <div className="text-center">
                  <div className="text-6xl mb-4">🌾</div>
                  <h3 className="text-2xl font-bold mb-2">Sản phẩm tươi hàng ngày</h3>
                  <p className="opacity-90">Trực tiếp từ nông trại địa phương</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/10 rounded-lg p-4 text-center">
                    <div className="text-3xl mb-2">🥕</div>
                    <p className="text-sm">Rau củ</p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-4 text-center">
                    <div className="text-3xl mb-2">🍎</div>
                    <p className="text-sm">Trái cây</p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-4 text-center">
                    <div className="text-3xl mb-2">🌾</div>
                    <p className="text-sm">Ngũ cốc</p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-4 text-center">
                    <div className="text-3xl mb-2">🔧</div>
                    <p className="text-sm">Dụng cụ</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}