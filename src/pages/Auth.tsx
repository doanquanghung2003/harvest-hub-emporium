import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Lock, User, Eye, EyeOff, Shield } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, Link } from "react-router-dom";

export default function Auth() {
  const [activeTab, setActiveTab] = useState("login");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const { login, register } = useAuth();
  const navigate = useNavigate();

  // Login form state
  const [loginData, setLoginData] = useState({
    username: "",
    password: ""
  });
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register form state
  const [registerData, setRegisterData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "USER"
  });
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showRegisterConfirm, setShowRegisterConfirm] = useState(false);
  
  // Email verification state
  const [verificationCode, setVerificationCode] = useState("");
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [isCodeVerified, setIsCodeVerified] = useState(false);
  const [codeSentMessage, setCodeSentMessage] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  const passwordChecks = {
    minLength: registerData.password.length >= 8,
    upperCase: /[A-Z]/.test(registerData.password),
    lowerCase: /[a-z]/.test(registerData.password),
    number: /\d/.test(registerData.password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(registerData.password)
  };

  const getRequirementClass = (isMet: boolean) =>
    `text-xs ${isMet ? "text-green-600" : "text-red-500"}`;

  // Use same API base URL as forgot password
  const API_BASE_URL = 'http://192.168.1.100:8082';

  // Countdown timer for resend code
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Reset verification state when email changes
  useEffect(() => {
    if (registerData.email) {
      setIsCodeSent(false);
      setIsCodeVerified(false);
      setVerificationCode("");
      setCodeSentMessage("");
    }
  }, [registerData.email]);

  // Send verification code
  const sendVerificationCode = async () => {
    if (!registerData.email) {
      setMessage("Vui lòng nhập email trước");
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(registerData.email)) {
      setMessage("Email không hợp lệ");
      return;
    }

    setIsSendingCode(true);
    setMessage("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/send-verification-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: registerData.email })
      });

      const data = await response.json();

      if (response.ok) {
        setIsCodeSent(true);
        setCodeSentMessage("Mã xác minh đã được gửi đến email của bạn");
        setResendCooldown(60); // 60 seconds cooldown
        setMessage("");
      } else {
        setMessage(data.error || data.message || "Không thể gửi mã xác minh");
      }
    } catch (err) {
      console.error('Send verification code error:', err);
      setMessage("Lỗi kết nối mạng. Vui lòng thử lại");
    } finally {
      setIsSendingCode(false);
    }
  };

  // Verify code
  const verifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setMessage("Vui lòng nhập mã xác minh 6 chữ số");
      return;
    }

    setIsLoading(true);
    setMessage("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/verify-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: registerData.email,
          code: verificationCode 
        })
      });

      const data = await response.json();

      if (response.ok) {
        setIsCodeVerified(true);
        setMessage("Email đã được xác minh thành công!");
      } else {
        setMessage(data.error || data.message || "Mã xác minh không đúng");
        setIsCodeVerified(false);
      }
    } catch (err) {
      console.error('Verify code error:', err);
      setMessage("Lỗi kết nối mạng. Vui lòng thử lại");
      setIsCodeVerified(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");

    if (!loginData.username || !loginData.password) {
      setMessage("Vui lòng nhập đầy đủ thông tin");
      setIsLoading(false);
      return;
    }

    const result = await login(loginData.username, loginData.password);
    if (result.success) {
      setMessage("Đăng nhập thành công!");
      setTimeout(() => {
        navigate("/");
      }, 1000);
    } else {
      setMessage(result.message);
    }
    setIsLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");

    if (!registerData.username || !registerData.email || !registerData.password) {
      setMessage("Vui lòng nhập đầy đủ thông tin");
      setIsLoading(false);
      return;
    }

    // Check if email is verified
    if (!isCodeVerified) {
      setMessage("Vui lòng xác minh email trước khi đăng ký");
      setIsLoading(false);
      return;
    }

    if (registerData.password !== registerData.confirmPassword) {
      setMessage("Mật khẩu xác nhận không khớp");
      setIsLoading(false);
      return;
    }

    if (registerData.password.length < 8) {
      setMessage("Mật khẩu phải có ít nhất 8 ký tự");
      setIsLoading(false);
      return;
    }

    const result = await register({
      username: registerData.username,
      email: registerData.email,
      password: registerData.password,
      role: registerData.role
    });

    if (result.success) {
      setMessage("Đăng ký thành công!");
      setTimeout(() => {
        navigate("/");
      }, 1000);
    } else {
      setMessage(result.message);
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-muted py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-md mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold">Đăng Nhập / Đăng Ký</h1>
              <p className="text-muted-foreground mt-2">
                Chào mừng bạn đến với AgriTrade
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-center">Tài Khoản</CardTitle>
              </CardHeader>
              <CardContent>
                {message && (
                  <div className={`mb-4 p-3 rounded text-sm ${
                    message.includes("thành công") 
                      ? "bg-green-100 text-green-700" 
                      : "bg-red-100 text-red-700"
                  }`}>
                    {message}
                  </div>
                )}

                <Tabs 
                  value={activeTab} 
                  onValueChange={(value) => {
                    setActiveTab(value);
                    // Reset verification state when switching tabs
                    if (value === "login") {
                      setIsCodeSent(false);
                      setIsCodeVerified(false);
                      setVerificationCode("");
                      setCodeSentMessage("");
                      setResendCooldown(0);
                    }
                  }} 
                  className="w-full"
                >
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="login">Đăng Nhập</TabsTrigger>
                    <TabsTrigger value="register">Đăng Ký</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="login">
                    <form onSubmit={handleLogin} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="username">Tên đăng nhập</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                          <Input
                            id="username"
                            type="text"
                            placeholder="Tên đăng nhập"
                            className="pl-10"
                            value={loginData.username}
                            onChange={(e) => setLoginData({...loginData, username: e.target.value})}
                            disabled={isLoading}
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="password">Mật Khẩu</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                          <Input
                            id="password"
                            type={showLoginPassword ? "text" : "password"}
                            placeholder="••••••••"
                            className="pl-10 pr-10"
                            value={loginData.password}
                            onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                            disabled={isLoading}
                          />
                          <button
                            type="button"
                            onClick={() => setShowLoginPassword(v => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                            aria-label={showLoginPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                          >
                            {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                      
                      <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? "Đang đăng nhập..." : "Đăng Nhập"}
                      </Button>
                      
                      <div className="text-center">
                        <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                          Quên mật khẩu?
                        </Link>
                      </div>
                    </form>
                  </TabsContent>
                  
                  <TabsContent value="register">
                    <form onSubmit={handleRegister} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Tên đăng nhập</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                          <Input
                            id="name"
                            placeholder="Tên đăng nhập"
                            className="pl-10"
                            value={registerData.username}
                            onChange={(e) => setRegisterData({...registerData, username: e.target.value})}
                            disabled={isLoading}
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="registerEmail">Email</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                          <Input
                            id="registerEmail"
                            type="email"
                            placeholder="your@email.com"
                            className="pl-10"
                            value={registerData.email}
                            onChange={(e) => setRegisterData({...registerData, email: e.target.value})}
                            disabled={isLoading || isCodeVerified}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={sendVerificationCode}
                          disabled={isLoading || isSendingCode || isCodeVerified || resendCooldown > 0 || !registerData.email}
                          className="w-full"
                        >
                          {isSendingCode 
                            ? "Đang gửi mã..." 
                            : resendCooldown > 0 
                            ? `Gửi lại mã (${resendCooldown}s)` 
                            : isCodeSent 
                            ? "Gửi lại mã xác minh" 
                            : "Gửi mã xác minh"}
                        </Button>
                        {codeSentMessage && (
                          <p className="text-xs text-green-600">{codeSentMessage}</p>
                        )}
                        {isCodeVerified && (
                          <p className="text-xs text-green-600 flex items-center gap-1">
                            <Shield className="h-3 w-3" />
                            Email đã được xác minh thành công
                          </p>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="verificationCode">Mã xác minh</Label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                            <Input
                              id="verificationCode"
                              type="text"
                              placeholder="Nhập mã 6 chữ số từ email"
                              className="pl-10"
                              value={verificationCode}
                              onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                                setVerificationCode(value);
                              }}
                              disabled={isLoading || !isCodeSent}
                              maxLength={6}
                            />
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={verifyCode}
                            disabled={isLoading || verificationCode.length !== 6 || !isCodeSent}
                          >
                            Xác minh
                          </Button>
                        </div>
                        {!isCodeSent && (
                          <p className="text-xs text-muted-foreground">
                            Vui lòng nhập email và nhấn "Gửi mã xác minh" để nhận mã
                          </p>
                        )}
                        {isCodeSent && !isCodeVerified && (
                          <p className="text-xs text-muted-foreground">
                            Nhập mã xác minh 6 chữ số đã được gửi đến email của bạn
                          </p>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="registerPassword">Mật Khẩu</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                          <Input
                            id="registerPassword"
                            type={showRegisterPassword ? "text" : "password"}
                            placeholder="••••••••"
                            className="pl-10 pr-10"
                            value={registerData.password}
                            onChange={(e) => setRegisterData({...registerData, password: e.target.value})}
                            disabled={isLoading}
                          />
                          <button
                            type="button"
                            onClick={() => setShowRegisterPassword(v => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                            aria-label={showRegisterPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                          >
                            {showRegisterPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        <div className="text-xs space-y-1">
                          <p className="font-medium">Yêu cầu mật khẩu:</p>
                          <ul className="list-disc list-inside space-y-0.5 ml-2">
                            <li className={getRequirementClass(passwordChecks.minLength)}>
                              Ít nhất 8 ký tự
                            </li>
                            <li className={getRequirementClass(passwordChecks.upperCase)}>
                              Có chữ cái in hoa (A-Z)
                            </li>
                            <li className={getRequirementClass(passwordChecks.lowerCase)}>
                              Có chữ cái thường (a-z)
                            </li>
                            <li className={getRequirementClass(passwordChecks.number)}>
                              Có chữ số (0-9)
                            </li>
                            <li className={getRequirementClass(passwordChecks.special)}>
                              Có ký tự đặc biệt (!@#$%^&*...)
                            </li>
                          </ul>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Xác Nhận Mật Khẩu</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                          <Input
                            id="confirmPassword"
                            type={showRegisterConfirm ? "text" : "password"}
                            placeholder="••••••••"
                            className="pl-10 pr-10"
                            value={registerData.confirmPassword}
                            onChange={(e) => setRegisterData({...registerData, confirmPassword: e.target.value})}
                            disabled={isLoading}
                          />
                          <button
                            type="button"
                            onClick={() => setShowRegisterConfirm(v => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                            aria-label={showRegisterConfirm ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                          >
                            {showRegisterConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                      
                      <Button 
                        type="submit" 
                        className="w-full" 
                        disabled={isLoading || !isCodeVerified}
                      >
                        {isLoading ? "Đang đăng ký..." : "Đăng Ký"}
                      </Button>
                      {!isCodeVerified && (
                        <p className="text-xs text-center text-muted-foreground">
                          Vui lòng xác minh email trước khi đăng ký
                        </p>
                      )}
                    </form>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}