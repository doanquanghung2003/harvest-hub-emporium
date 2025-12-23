import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Phone, Mail, Clock, MessageCircle, HeadphonesIcon } from "lucide-react";

export default function Contact() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-gradient-to-r from-primary/10 to-secondary/10 py-16">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Liên Hệ Với Chúng Tôi
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              Chúng tôi luôn sẵn sàng hỗ trợ bạn. Hãy liên hệ với đội ngũ Harvest Hub 
              để được tư vấn và giải đáp mọi thắc mắc.
            </p>
          </div>
        </section>

        {/* Contact Info & Form */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-12">
              {/* Contact Information */}
              <div>
                <h2 className="text-3xl font-bold mb-8">Thông Tin Liên Hệ</h2>
                
                <div className="space-y-6">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-start space-x-4">
                        <MapPin className="h-6 w-6 text-primary mt-1" />
                        <div>
                          <h3 className="font-semibold mb-2">Địa Chỉ Văn Phòng</h3>
                          <p className="text-muted-foreground">
                            123 Đường Nông Nghiệp, Quận 1<br />
                            TP. Hồ Chí Minh, Việt Nam
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-start space-x-4">
                        <Phone className="h-6 w-6 text-primary mt-1" />
                        <div>
                          <h3 className="font-semibold mb-2">Điện Thoại</h3>
                          <p className="text-muted-foreground">
                            Hotline: <a href="tel:+84123456789" className="text-primary hover:underline">+84 123 456 789</a><br />
                            Hỗ trợ kỹ thuật: <a href="tel:+84987654321" className="text-primary hover:underline">+84 987 654 321</a>
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-start space-x-4">
                        <Mail className="h-6 w-6 text-primary mt-1" />
                        <div>
                          <h3 className="font-semibold mb-2">Email</h3>
                          <p className="text-muted-foreground">
                            Tổng đài: <a href="mailto:support@harvesthub.vn" className="text-primary hover:underline">support@harvesthub.vn</a><br />
                            Kinh doanh: <a href="mailto:sales@harvesthub.vn" className="text-primary hover:underline">sales@harvesthub.vn</a>
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-start space-x-4">
                        <Clock className="h-6 w-6 text-primary mt-1" />
                        <div>
                          <h3 className="font-semibold mb-2">Giờ Làm Việc</h3>
                          <p className="text-muted-foreground">
                            Thứ 2 - Thứ 6: 8:00 - 18:00<br />
                            Thứ 7: 8:00 - 12:00<br />
                            Chủ nhật: Nghỉ
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Contact Form */}
              <div>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-2xl">Gửi Tin Nhắn</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">Họ</Label>
                        <Input id="firstName" placeholder="Nguyễn" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Tên</Label>
                        <Input id="lastName" placeholder="Văn A" />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input id="email" type="email" placeholder="your@email.com" required />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="phone">Số Điện Thoại</Label>
                      <Input id="phone" type="tel" placeholder="0123 456 789" />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="subject">Chủ Đề *</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn chủ đề" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">Câu hỏi chung</SelectItem>
                          <SelectItem value="selling">Hỗ trợ bán hàng</SelectItem>
                          <SelectItem value="buying">Hỗ trợ mua hàng</SelectItem>
                          <SelectItem value="technical">Hỗ trợ kỹ thuật</SelectItem>
                          <SelectItem value="partnership">Hợp tác kinh doanh</SelectItem>
                          <SelectItem value="complaint">Khiếu nại</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="message">Nội Dung *</Label>
                      <Textarea 
                        id="message" 
                        placeholder="Mô tả chi tiết vấn đề hoặc câu hỏi của bạn..."
                        rows={5}
                        required
                      />
                    </div>
                    
                    <Button className="w-full" size="lg">
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Gửi Tin Nhắn
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Support */}
        <section className="bg-muted py-16">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Hỗ Trợ Nhanh</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Cần hỗ trợ ngay lập tức? Sử dụng các kênh hỗ trợ nhanh của chúng tôi
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              <Card className="text-center">
                <CardContent className="p-8">
                  <HeadphonesIcon className="h-16 w-16 text-primary mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-3">Hotline 24/7</h3>
                  <p className="text-muted-foreground mb-4">
                    Gọi ngay để được hỗ trợ trực tiếp
                  </p>
                  <Button>
                    <Phone className="h-4 w-4 mr-2" />
                    1800 1234
                  </Button>
                </CardContent>
              </Card>
              
              <Card className="text-center">
                <CardContent className="p-8">
                  <MessageCircle className="h-16 w-16 text-primary mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-3">Live Chat</h3>
                  <p className="text-muted-foreground mb-4">
                    Chat trực tuyến với đội ngũ hỗ trợ
                  </p>
                  <Button variant="outline">
                    Bắt Đầu Chat
                  </Button>
                </CardContent>
              </Card>
              
              <Card className="text-center">
                <CardContent className="p-8">
                  <Mail className="h-16 w-16 text-primary mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-3">Email Support</h3>
                  <p className="text-muted-foreground mb-4">
                    Gửi email để được hỗ trợ chi tiết
                  </p>
                  <Button variant="outline">
                    Gửi Email
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Map Section */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-8">Vị Trí Văn Phòng</h2>
            <div className="bg-muted rounded-lg h-96 flex items-center justify-center">
              <div className="text-center">
                <MapPin className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Bản đồ tương tác sẽ được hiển thị ở đây
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}