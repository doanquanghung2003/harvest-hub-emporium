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

// Use same API base URL as Auth.tsx (ngrok URL for OAuth2)
const ngrokUrl = 'https://f64055e91085.ngrok-free.app';
const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || ngrokUrl;

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Function to validate token
  const validateToken = async (token: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      // If response is ok, token is valid
      if (response.ok) {
        return true;
      }
      
      // If 401 or 403, token is invalid
      if (response.status === 401 || response.status === 403) {
        console.warn('Token validation failed: Unauthorized');
        return false;
      }
      
      // For other errors (network, 500, etc.), assume token might still be valid
      // Don't clear token on network errors
      console.warn('Token validation error (non-auth):', response.status);
      return true; // Assume valid to avoid clearing token on network errors
    } catch (error) {
      // Network error - don't clear token, assume it's still valid
      console.warn('Token validation network error (assuming valid):', error);
      return true; // Assume valid to avoid clearing token on network errors
    }
  };

  // Function to load user from localStorage
  const loadUserFromStorage = async (skipValidation = false) => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (savedToken && savedUser) {
      // If skipValidation is true (e.g., from OAuth2 callback), set directly
      if (skipValidation) {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
        setIsLoading(false);
        return;
      }
      
      // Otherwise, validate the token
      try {
        const isValid = await validateToken(savedToken);
        if (isValid) {
          setToken(savedToken);
          setUser(JSON.parse(savedUser));
        } else {
          // Token is invalid, clear storage
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setToken(null);
          setUser(null);
        }
      } catch (error) {
        console.error('Error validating token:', error);
        // On error, still try to use the token (might be network issue)
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      }
    } else {
      setToken(null);
      setUser(null);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    // Check if user is already logged in on mount
    loadUserFromStorage();

    // Listen for storage changes (e.g., from OAuth2 callback)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'token' || e.key === 'user') {
        loadUserFromStorage();
      }
    };

    // Listen for custom storage events (dispatched from same tab)
    const handleCustomStorageChange = (e?: Event) => {
      // If event has skipValidation flag, skip validation (for OAuth2)
      const customEvent = e as CustomEvent;
      const skipValidation = customEvent?.detail?.skipValidation || false;
      loadUserFromStorage(skipValidation);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('auth-storage-change', handleCustomStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('auth-storage-change', handleCustomStorageChange);
    };
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
