import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Mail, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

export default function ForgotPassword() {
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [resetLink, setResetLink] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!emailOrUsername.trim()) {
      toast({
        title: "Lỗi",
        description: "Vui lòng nhập email hoặc tên đăng nhập",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("http://localhost:8081/api/auth/forgot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ emailOrUsername }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        setResetLink(data.resetLink || "");
        toast({
          title: "Thành công",
          description: "Link đặt lại mật khẩu đã được tạo. Vui lòng kiểm tra link bên dưới.",
        });
      } else {
        toast({
          title: "Lỗi",
          description: data.error || "Có lỗi xảy ra. Vui lòng thử lại.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Lỗi",
        description: "Không thể kết nối đến server. Vui lòng thử lại sau.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-muted py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-md mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="text-center">Quên Mật Khẩu</CardTitle>
                <CardDescription className="text-center">
                  Nhập email hoặc tên đăng nhập để nhận link đặt lại mật khẩu
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!success ? (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="emailOrUsername">Email hoặc Tên đăng nhập</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                        <Input
                          id="emailOrUsername"
                          type="text"
                          placeholder="Email hoặc tên đăng nhập"
                          className="pl-10"
                          value={emailOrUsername}
                          onChange={(e) => setEmailOrUsername(e.target.value)}
                          disabled={isLoading}
                        />
                      </div>
                    </div>

                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? "Đang xử lý..." : "Gửi Link Đặt Lại Mật Khẩu"}
                    </Button>

                    <div className="text-center">
                      <Link
                        to="/auth"
                        className="text-sm text-primary hover:underline flex items-center justify-center gap-1"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        Quay lại đăng nhập
                      </Link>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-800 mb-2">
                        Link đặt lại mật khẩu đã được tạo thành công!
                      </p>
                      {resetLink && (
                        <div className="mt-4">
                          <p className="text-xs text-muted-foreground mb-2">
                            Link đặt lại mật khẩu (click để mở):
                          </p>
                          <a
                            href={resetLink}
                            className="text-xs text-primary break-all hover:underline"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {resetLink}
                          </a>
                        </div>
                      )}
                    </div>

                    <Button
                      onClick={() => navigate("/auth")}
                      className="w-full"
                      variant="outline"
                    >
                      Quay lại đăng nhập
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

