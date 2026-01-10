import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Lock, User, Eye, EyeOff, Shield } from "lucide-react";
import { Separator } from "@/components/ui/separator";
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
  // Sử dụng ngrok URL cho OAuth2 (cập nhật khi ngrok URL thay đổi)
  const ngrokUrl = 'https://f64055e91085.ngrok-free.app';
  const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || ngrokUrl;

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

  // Handle OAuth2 login
  const handleOAuth2Login = (provider: 'google' | 'facebook') => {
    // Sử dụng ngrok URL cho OAuth2 (cập nhật khi ngrok URL thay đổi)
    const ngrokUrl = 'https://f64055e91085.ngrok-free.app';
    const oauthUrl = `${ngrokUrl}/oauth2/authorization/${provider}`;
    window.location.href = oauthUrl;
  };

  // Handle OAuth2 callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const provider = urlParams.get('provider');
    
    if (token && provider) {
      // Save token first
      localStorage.setItem('token', token);
      
      // Fetch user info
      fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
        .then(res => {
          if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
          }
          return res.json();
        })
        .then(data => {
          if (data.id) {
            // Save user info
            localStorage.setItem('user', JSON.stringify(data));
            
            // Dispatch custom event with skipValidation flag for OAuth2
            // This tells useAuth to set state directly without validating (token is fresh)
            window.dispatchEvent(new CustomEvent('auth-storage-change', {
              detail: { skipValidation: true }
            }));
            
            setMessage(`Đăng nhập thành công với ${provider === 'google' ? 'Google' : 'Facebook'}!`);
            
            // Wait a bit for useAuth hook to update, then navigate
            setTimeout(() => {
              navigate("/", { replace: true });
            }, 500);
          } else {
            throw new Error('Invalid user data received');
          }
        })
        .catch(err => {
          console.error('OAuth2 callback error:', err);
          setMessage("Đăng nhập thành công nhưng không thể lấy thông tin người dùng. Vui lòng thử lại.");
          // Clear invalid token
          localStorage.removeItem('token');
        });
      
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [navigate, API_BASE_URL]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-muted py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-md mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold">Đăng Nhập / Đăng Ký</h1>
              <p className="text-muted-foreground mt-2">
                Chào mừng bạn đến với Harvest Hub
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
                      
                      <div className="relative my-4">
                        <div className="absolute inset-0 flex items-center">
                          <Separator />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-background px-2 text-muted-foreground">
                            Hoặc đăng nhập với
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleOAuth2Login('google')}
                          disabled={isLoading}
                          className="w-full flex items-center justify-center"
                        >
                          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                            <path
                              fill="currentColor"
                              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            />
                            <path
                              fill="currentColor"
                              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                              fill="currentColor"
                              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            />
                            <path
                              fill="currentColor"
                              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            />
                          </svg>
                          Google
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleOAuth2Login('facebook')}
                          disabled={isLoading}
                          className="w-full flex items-center justify-center"
                        >
                          <svg className="mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                          </svg>
                          Facebook
                        </Button>
                      </div>

                      <div className="relative my-4">
                        <div className="absolute inset-0 flex items-center">
                          <Separator />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-background px-2 text-muted-foreground">
                            Hoặc
                          </span>
                        </div>
                      </div>

                      <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? "Đang đăng nhập..." : "Đăng Nhập"}
                      </Button>
                      
                      <div className="text-center mt-4">
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
                      
                      <div className="relative my-4">
                        <div className="absolute inset-0 flex items-center">
                          <Separator />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-background px-2 text-muted-foreground">
                            Hoặc đăng ký với
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleOAuth2Login('google')}
                          disabled={isLoading}
                          className="w-full flex items-center justify-center"
                        >
                          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                            <path
                              fill="currentColor"
                              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            />
                            <path
                              fill="currentColor"
                              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                              fill="currentColor"
                              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            />
                            <path
                              fill="currentColor"
                              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            />
                          </svg>
                          Google
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleOAuth2Login('facebook')}
                          disabled={isLoading}
                          className="w-full flex items-center justify-center"
                        >
                          <svg className="mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                          </svg>
                          Facebook
                        </Button>
                      </div>

                      <div className="relative my-4">
                        <div className="absolute inset-0 flex items-center">
                          <Separator />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-background px-2 text-muted-foreground">
                            Hoặc
                          </span>
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
                        <p className="text-xs text-center text-muted-foreground mt-2">
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