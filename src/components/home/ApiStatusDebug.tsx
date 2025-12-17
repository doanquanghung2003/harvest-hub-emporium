import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { productService } from '@/services/productService';

export function ApiStatusDebug() {
  const [apiStatus, setApiStatus] = useState<'checking' | 'success' | 'error'>('checking');
  const [productCount, setProductCount] = useState<number>(0);
  const [lastError, setLastError] = useState<string>('');

  const testApi = async () => {
    try {
      setApiStatus('checking');
      setLastError('');
      
      console.log('🧪 Testing API connection...');
      const products = await productService.getProducts();
      
      console.log('✅ API test successful:', products);
      setApiStatus('success');
      setProductCount(products?.length || 0);
    } catch (error) {
      console.error('❌ API test failed:', error);
      setApiStatus('error');
      setLastError(error instanceof Error ? error.message : String(error));
    }
  };

  useEffect(() => {
    testApi();
  }, []);

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🔧 API Status Debug
          <Badge variant={apiStatus === 'success' ? 'default' : apiStatus === 'error' ? 'destructive' : 'secondary'}>
            {apiStatus === 'checking' ? 'Checking...' : apiStatus === 'success' ? 'Connected' : 'Failed'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <strong>Status:</strong> {apiStatus}
          </div>
          <div>
            <strong>Products Found:</strong> {productCount}
          </div>
        </div>
        
        {lastError && (
          <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
            <strong>Error:</strong> {lastError}
          </div>
        )}
        
        <div className="flex gap-2">
          <Button onClick={testApi} size="sm">
            🔄 Test Again
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              console.log('📊 Current API status:', { apiStatus, productCount, lastError });
            }}
          >
            📊 Log Status
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
