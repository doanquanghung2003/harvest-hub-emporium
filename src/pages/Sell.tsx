import React, { useState, useCallback, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, TrendingUp, Users, Shield, DollarSign, CheckCircle } from "lucide-react";
import { AuthGuard } from "@/components/AuthGuard";
import { useAuth } from "@/hooks/useAuth";
import { productService } from "@/services/productService";

export default function Sell() {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    farmName: "",
    ownerName: "",
    email: "",
    phone: "",
    address: "",
    category: "",
    experience: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [categories, setCategories] = useState<any[]>([]);

  // Fetch categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await productService.getCategories();
        setCategories(data);
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };
    fetchCategories();
  }, []);

  const handleInputChange = useCallback((field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const validFiles = files.filter(file => {
        const isValidType = file.type === 'application/pdf' ||
          file.type.startsWith('image/');
        const isValidSize = file.size <= 5 * 1024 * 1024; // 5MB
        return isValidType && isValidSize;
      });

      if (validFiles.length !== files.length) {
        setMessage("Một số file không hợp lệ. Chỉ chấp nhận PDF và hình ảnh dưới 5MB.");
        setMessageType("error");
      }

      setSelectedFiles(prev => [...prev, ...validFiles]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");

    try {
      // Tạo FormData để gửi dữ liệu
      const sellerData = {
        userId: user?.id, // Thêm userId từ user hiện tại
        businessName: formData.farmName,
        contactPerson: formData.ownerName,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        farmType: formData.category,
        description: formData.experience,
        status: "pending",
        businessType: "individual",
        certifications: selectedFiles.map(file => file.name)
      };

      const response = await fetch('http://localhost:8081/api/sellers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sellerData)
      });

      const result = await response.json();

      if (result.success) {
        setMessage("Đăng ký thành công! Chúng tôi sẽ liên hệ với bạn trong vòng 24h.");
        setMessageType("success");
        // Reset form
        setFormData({
          farmName: "",
          ownerName: "",
          email: "",
          phone: "",
          address: "",
          category: "",
          experience: ""
        });
        setSelectedFiles([]);
      } else {
        setMessage(result.message || "Có lỗi xảy ra. Vui lòng thử lại sau.");
        setMessageType("error");
      }
    } catch (error) {
      console.error('Error submitting seller registration:', error);
      setMessage("Có lỗi xảy ra. Vui lòng thử lại sau.");
      setMessageType("error");
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <AuthGuard>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">
          {/* Hero Section */}
          <section className="bg-gradient-to-r from-primary/10 to-secondary/10 py-16">
            <div className="container mx-auto px-4 text-center">
              <h1 className="text-4xl md:text-6xl font-bold mb-6">
                Bán Hàng Cùng AgriTrade
              </h1>
              <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
                Tiếp cận hàng triệu khách hàng trên toàn quốc. Bán sản phẩm nông nghiệp
                của bạn với chi phí thấp và hỗ trợ tối đa.
              </p>
              <Button 
                size="lg" 
                className="mr-4"
                onClick={() => {
                  const formSection = document.getElementById('registration-form');
                  if (formSection) {
                    formSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }}
              >
                Đăng Ký Ngay
              </Button>
              <Button size="lg" variant="outline">
                Tìm Hiểu Thêm
              </Button>
            </div>
          </section>

          {/* Benefits */}
          <section className="py-16">
            <div className="container mx-auto px-4">
              <h2 className="text-3xl font-bold text-center mb-12">Tại Sao Chọn AgriTrade?</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                <div className="text-center">
                  <TrendingUp className="h-16 w-16 text-primary mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-3">Tăng Doanh Thu</h3>
                  <p className="text-muted-foreground">
                    Tiếp cận thị trường rộng lớn với hàng triệu khách hàng tiềm năng
                  </p>
                </div>
                <div className="text-center">
                  <Users className="h-16 w-16 text-primary mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-3">Hỗ Trợ 24/7</h3>
                  <p className="text-muted-foreground">
                    Đội ngũ hỗ trợ chuyên nghiệp giúp bạn bán hàng hiệu quả
                  </p>
                </div>
                <div className="text-center">
                  <Shield className="h-16 w-16 text-primary mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-3">An Toàn Bảo Mật</h3>
                  <p className="text-muted-foreground">
                    Giao dịch an toàn với hệ thống bảo mật hàng đầu
                  </p>
                </div>
                <div className="text-center">
                  <DollarSign className="h-16 w-16 text-primary mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-3">Phí Thấp</h3>
                  <p className="text-muted-foreground">
                    Chi phí hoa hồng cạnh tranh, tối ưu lợi nhuận cho người bán
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Registration Form */}
          <section id="registration-form" className="bg-muted py-16">
            <div className="container mx-auto px-4">
              <div className="max-w-2xl mx-auto">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-2xl text-center">Đăng Ký Bán Hàng</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {message && (
                      <div className={`p-3 rounded text-sm ${messageType === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                        {message}
                      </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="farmName">Tên Trang Trại/Cơ Sở</Label>
                          <Input
                            id="farmName"
                            placeholder="Trang trại ABC"
                            value={formData.farmName}
                            onChange={(e) => handleInputChange('farmName', e.target.value)}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="ownerName">Tên Chủ Sở Hữu</Label>
                          <Input
                            id="ownerName"
                            placeholder="Nguyễn Văn A"
                            value={formData.ownerName}
                            onChange={(e) => handleInputChange('ownerName', e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            placeholder="contact@farm.com"
                            value={formData.email}
                            onChange={(e) => handleInputChange('email', e.target.value)}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="phone">Số Điện Thoại</Label>
                          <Input
                            id="phone"
                            placeholder="0123 456 789"
                            value={formData.phone}
                            onChange={(e) => handleInputChange('phone', e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="address">Địa Chỉ Trang Trại</Label>
                        <Textarea
                          id="address"
                          placeholder="123 Đường ABC, Xã XYZ, Huyện DEF, Tỉnh GHI"
                          value={formData.address}
                          onChange={(e) => handleInputChange('address', e.target.value)}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="category">Loại Sản Phẩm Chính</Label>
                        <select
                          id="category"
                          value={formData.category}
                          onChange={(e) => handleInputChange('category', e.target.value)}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          required
                        >
                          <option value="">Chọn loại sản phẩm</option>
                          {categories.map(cat => (
                            <option key={cat.id} value={cat.name}>{cat.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="experience">Kinh Nghiệm Sản Xuất</Label>
                        <Input
                          id="experience"
                          placeholder="Ví dụ: 5 năm, 10 năm..."
                          value={formData.experience}
                          onChange={(e) => handleInputChange('experience', e.target.value)}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="certificates">Giấy Tờ Chứng Nhận</Label>
                        <div className="border-2 border-dashed border-muted-foreground rounded-lg p-8 text-center">
                          <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                          <p className="text-muted-foreground mb-4">
                            Tải lên giấy phép kinh doanh, chứng nhận VietGAP, GlobalGAP...
                          </p>
                          <p className="text-sm text-muted-foreground mb-4">
                            Chấp nhận: PDF, JPG, PNG (tối đa 5MB mỗi file)
                          </p>
                          <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={handleFileChange}
                            className="hidden"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            className="mt-4"
                            onClick={openFileDialog}
                          >
                            Chọn File
                          </Button>
                        </div>

                        {/* Hiển thị danh sách file đã chọn */}
                        {selectedFiles.length > 0 && (
                          <div className="mt-4 space-y-2">
                            <p className="text-sm font-medium">Files đã chọn:</p>
                            {selectedFiles.map((file, index) => (
                              <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                                <span className="text-sm truncate">{file.name}</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeFile(index)}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  ✕
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <Button className="w-full" size="lg" type="submit" disabled={isLoading}>
                        {isLoading ? "Đang gửi..." : "Gửi Đăng Ký"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>

          {/* Success Stories */}
          <section className="py-16">
            <div className="container mx-auto px-4">
              <h2 className="text-3xl font-bold text-center mb-12">Câu Chuyện Thành Công</h2>
              <div className="grid md:grid-cols-3 gap-8">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center mb-4">
                      <CheckCircle className="h-8 w-8 text-green-500 mr-3" />
                      <Badge variant="secondary">Nông Dân Tiên Phong</Badge>
                    </div>
                    <h3 className="text-xl font-semibold mb-3">Anh Nguyễn Văn B</h3>
                    <p className="text-muted-foreground mb-4">
                      "Từ khi bán hàng trên AgriTrade, doanh thu của tôi tăng 300%.
                      Khách hàng rất tin tưởng vào chất lượng sản phẩm."
                    </p>
                    <div className="text-sm text-muted-foreground">
                      Trang trải rau sạch • Đồng Nai
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center mb-4">
                      <CheckCircle className="h-8 w-8 text-green-500 mr-3" />
                      <Badge variant="secondary">Nhà Cung Cấp VIP</Badge>
                    </div>
                    <h3 className="text-xl font-semibold mb-3">Chị Trần Thị C</h3>
                    <p className="text-muted-foreground mb-4">
                      "Platform rất dễ sử dụng, hỗ trợ tận tình. Tôi có thể quản lý
                      đơn hàng hiệu quả và tiếp cận nhiều khách hàng hơn."
                    </p>
                    <div className="text-sm text-muted-foreground">
                      Vườn trái cây • Cần Thơ
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center mb-4">
                      <CheckCircle className="h-8 w-8 text-green-500 mr-3" />
                      <Badge variant="secondary">Đối Tác Chiến Lược</Badge>
                    </div>
                    <h3 className="text-xl font-semibold mb-3">HTX Nông Nghiệp D</h3>
                    <p className="text-muted-foreground mb-4">
                      "AgriTrade giúp chúng tôi mở rộng thị trường ra toàn quốc.
                      Doanh số tăng trưởng ổn định qua từng tháng."
                    </p>
                    <div className="text-sm text-muted-foreground">
                      Hợp tác xã • Lâm Đồng
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </AuthGuard>
  );
}