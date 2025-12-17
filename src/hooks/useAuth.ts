import { useState, useEffect } from 'react';

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  avatar?: string;
}

interface AuthResponse {
  message?: string;
  token?: string;
  user?: User;
  error?: string;
  errors?: string[];
}

const API_BASE_URL = 'http://192.168.1.100:8082';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Function to validate token
  const validateToken = async (token: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/user/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      return response.ok;
    } catch (error) {
      console.error('Token validation error:', error);
      return false;
    }
  };

  useEffect(() => {
    // Check if user is already logged in
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (savedToken && savedUser) {
      // Validate the token
      validateToken(savedToken).then(isValid => {
        if (isValid) {
          setToken(savedToken);
          setUser(JSON.parse(savedUser));
        } else {
          // Token is invalid, clear storage
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
        setIsLoading(false);
      });
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (username: string, password: string): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data: AuthResponse = await response.json();

      if (response.ok) {
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        return { success: true, message: data.message };
      } else {
        return { success: false, message: data.error || 'Đăng nhập thất bại' };
      }
    } catch (err) {
      console.error('Login error:', err);
      return { success: false, message: 'Lỗi kết nối mạng' };
    }
  };

  const register = async (userData: {
    username: string;
    password: string;
    email: string;
    role: string;
  }): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });

      const data: AuthResponse = await response.json();

      if (response.ok) {
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        return { success: true, message: data.message };
      } else {
        // Xử lý lỗi validation password chi tiết
        let errorMessage = data.error || 'Đăng ký thất bại';
        
        // Nếu có errors array (từ password validation), hiển thị chi tiết
        if (data.errors && Array.isArray(data.errors) && data.errors.length > 0) {
          errorMessage = data.message || data.errors.join('. ');
        } else if (data.message) {
          errorMessage = data.message;
        }
        
        return { success: false, message: errorMessage };
      }
    } catch (err) {
      console.error('Register error:', err);
      return { success: false, message: 'Lỗi kết nối mạng' };
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // Trigger storage event for other tabs
    window.dispatchEvent(new Event('storage'));
  };

  const isAuthenticated = !!user && !!token;
  const isAdmin = user?.role === 'ADMIN';

  return {
    user,
    token,
    isLoading,
    isAuthenticated,
    isAdmin,
    login,
    register,
    logout
  };
}
