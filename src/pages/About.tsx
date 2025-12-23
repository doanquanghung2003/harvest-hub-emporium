import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sprout, Users, Truck, Shield, Heart, Award } from "lucide-react";

export default function About() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-gradient-to-r from-primary/10 to-secondary/10 py-16">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Về Chúng Tôi
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              Harvest Hub là nền tảng thương mại điện tử hàng đầu kết nối nông dân và người tiêu dùng, 
              mang đến những sản phẩm nông nghiệp tươi ngon và chất lượng nhất.
            </p>
          </div>
        </section>

        {/* Mission & Vision */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-12">
              <Card>
                <CardContent className="p-8">
                  <div className="flex items-center mb-4">
                    <Heart className="h-8 w-8 text-primary mr-3" />
                    <h2 className="text-3xl font-bold">Sứ Mệnh</h2>
                  </div>
                  <p className="text-muted-foreground text-lg">
                    Kết nối trực tiếp giữa nông dân và người tiêu dùng, loại bỏ các khâu trung gian 
                    để mang lại giá trị tốt nhất cho cả hai bên. Chúng tôi cam kết hỗ trợ nông nghiệp 
                    bền vững và phát triển cộng đồng nông thôn.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-8">
                  <div className="flex items-center mb-4">
                    <Award className="h-8 w-8 text-primary mr-3" />
                    <h2 className="text-3xl font-bold">Tầm Nhìn</h2>
                  </div>
                  <p className="text-muted-foreground text-lg">
                    Trở thành nền tảng thương mại nông sản số 1 Việt Nam, góp phần hiện đại hóa 
                    ngành nông nghiệp và nâng cao thu nhập cho người nông dân thông qua công nghệ 
                    và mô hình kinh doanh minh bạch.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Our Values */}
        <section className="bg-muted py-16">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">Giá Trị Cốt Lõi</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <Sprout className="h-16 w-16 text-primary mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-3">Chất Lượng</h3>
                <p className="text-muted-foreground">
                  Cam kết mang đến những sản phẩm nông nghiệp tươi ngon, an toàn và chất lượng cao nhất.
                </p>
              </div>
              <div className="text-center">
                <Users className="h-16 w-16 text-primary mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-3">Minh Bạch</h3>
                <p className="text-muted-foreground">
                  Xây dựng mối quan hệ tin cậy thông qua việc minh bạch nguồn gốc và quy trình sản xuất.
                </p>
              </div>
              <div className="text-center">
                <Shield className="h-16 w-16 text-primary mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-3">Bền Vững</h3>
                <p className="text-muted-foreground">
                  Hỗ trợ nông nghiệp bền vững và bảo vệ môi trường cho thế hệ tương lai.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Team Stats */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">Con Số Ấn Tượng</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="text-4xl font-bold text-primary mb-2">1000+</div>
                <div className="text-muted-foreground">Nông Dân Đối Tác</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-primary mb-2">50K+</div>
                <div className="text-muted-foreground">Khách Hàng Tin Tưởng</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-primary mb-2">500+</div>
                <div className="text-muted-foreground">Sản Phẩm Đa Dạng</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-primary mb-2">63</div>
                <div className="text-muted-foreground">Tỉnh Thành Phủ Sóng</div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-primary text-primary-foreground py-16">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-6">Tham Gia Cùng Chúng Tôi</h2>
            <p className="text-xl mb-8 opacity-90">
              Hãy trở thành một phần của cộng đồng Harvest Hub và cùng xây dựng nền nông nghiệp bền vững
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" variant="secondary">
                Đăng Ký Bán Hàng
              </Button>
              <Button size="lg" variant="secondary" className="bg-background text-foreground hover:bg-background/90 border border-primary-foreground/20">
                Liên Hệ Ngay
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}