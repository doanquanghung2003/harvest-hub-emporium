import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function AuthTest() {
  const { user, token, isAuthenticated, login, logout } = useAuth();
  const [testResults, setTestResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testAuth = async () => {
    setLoading(true);
    try {
      // Test 1: Check authentication status
      const authResponse = await fetch('http://localhost:8081/api/auth/check-auth', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const authData = await authResponse.json();
      console.log('Auth check result:', authData);

      // Test 2: Get user profile
      const profileResponse = await fetch('http://localhost:8081/api/user/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const profileData = await profileResponse.json();
      console.log('Profile result:', profileData);

      setTestResults({
        auth: authData,
        profile: profileData,
        authStatus: authResponse.status,
        profileStatus: profileResponse.status
      });
    } catch (error) {
      console.error('Test error:', error);
      setTestResults({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const testLogin = async () => {
    const result = await login('admin', 'admin123');
    console.log('Login result:', result);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Authentication Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p><strong>Is Authenticated:</strong> {isAuthenticated ? 'Yes' : 'No'}</p>
          <p><strong>User:</strong> {user ? JSON.stringify(user) : 'None'}</p>
          <p><strong>Token:</strong> {token ? token.substring(0, 20) + '...' : 'None'}</p>
        </div>

        <div className="flex space-x-2">
          <Button onClick={testLogin} disabled={isAuthenticated}>
            Test Login
          </Button>
          <Button onClick={testAuth} disabled={!isAuthenticated || loading}>
            {loading ? 'Testing...' : 'Test Auth'}
          </Button>
          <Button onClick={logout} variant="destructive">
            Logout
          </Button>
        </div>

        {testResults && (
          <div className="mt-4 p-4 bg-gray-100 rounded">
            <h3 className="font-bold mb-2">Test Results:</h3>
            <pre className="text-sm overflow-auto">
              {JSON.stringify(testResults, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
