import React, { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Send, X, Minimize2, Maximize2, AlertCircle } from 'lucide-react';
import { chatService, ChatMessage, ChatProduct, ChatResponse } from '@/services/chatService';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  products?: ChatProduct[];
}

const ChatBox = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Xin chào! Tôi là trợ lý AI của Harvest Hub. Tôi có thể hỗ trợ bạn về sản phẩm nông sản, đặt hàng, vận chuyển và nhiều vấn đề khác. Bạn cần hỗ trợ gì hôm nay?',
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isTyping) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue.trim(),
      sender: 'user',
      timestamp: new Date()
    };

    const userInput = inputValue.trim();
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);
    setError(null);

    try {
      console.log('💬 Gửi tin nhắn:', userInput);
      // Chuyển đổi messages sang format cho chatService
      const chatHistory: ChatMessage[] = messages.map(msg => ({
        id: msg.id,
        text: msg.text,
        sender: msg.sender,
        timestamp: msg.timestamp
      }));

      // Gọi AI service
      console.log('📡 Đang gọi chatService.sendMessage...');
      const aiResponse = await chatService.sendMessage(userInput, chatHistory);
      console.log('✅ Nhận được phản hồi từ AI:', aiResponse);

      // Parse response - có thể là JSON string hoặc plain string
      let responseText: string;
      let products: ChatProduct[] | undefined;
      
      try {
        const parsed = JSON.parse(aiResponse);
        if (parsed.message || parsed.response) {
          responseText = parsed.message || parsed.response;
          products = parsed.products;
        } else {
          responseText = aiResponse;
        }
      } catch {
        // Nếu không phải JSON, dùng trực tiếp
        responseText = aiResponse;
      }

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: responseText,
        sender: 'bot',
        timestamp: new Date(),
        products: products
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = error instanceof Error ? error.message : 'Có lỗi xảy ra khi gửi tin nhắn';
      setError(errorMessage);
      
      // Hiển thị thông báo lỗi
      toast({
        title: "Lỗi",
        description: errorMessage,
        variant: "destructive",
      });

      // Vẫn thêm phản hồi fallback
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Xin lỗi, có vấn đề kỹ thuật. Vui lòng thử lại sau hoặc liên hệ hotline: 1900-xxxx',
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMessage]);
    } finally {
      setIsTyping(false);
      // Focus lại input sau khi gửi
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          className="h-14 w-14 rounded-full bg-primary hover:bg-primary/90 shadow-lg transition-all duration-300 hover:shadow-xl"
          size="icon"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
        <Badge className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground">
          Tư vấn
        </Badge>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Card className={`w-80 transition-all duration-300 ${isMinimized ? 'h-16' : 'h-96'} shadow-lg border-border`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-primary text-primary-foreground rounded-t-lg">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src="/placeholder.svg" alt="AI Assistant" />
              <AvatarFallback className="bg-primary-foreground text-primary text-xs">
                AI
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-sm">Trợ lý AI</p>
              <p className="text-xs opacity-90">Hỗ trợ 24/7</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMinimized(!isMinimized)}
              className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
            >
              {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* Messages */}
            <div className="flex-1 p-4 space-y-3 max-h-64 overflow-y-auto">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'} gap-2`}
                >
                  {message.sender === 'bot' && (
                    <Avatar className="h-6 w-6 mt-1">
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        AI
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={`max-w-[80%] p-3 rounded-lg text-sm ${
                      message.sender === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{message.text}</p>
                    
                    {/* Hiển thị products nếu có */}
                    {message.sender === 'bot' && message.products && message.products.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {message.products.map((product) => {
                          const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || '';
                          const imageUrl = product.image 
                            ? (product.image.startsWith('http') 
                                ? product.image 
                                : `${API_BASE_URL}${product.image.startsWith('/') ? '' : '/'}${product.image}`)
                            : '/placeholder.svg';
                          
                          return (
                            <Link 
                              key={product.id} 
                              to={`/product/${product.id}`}
                              className="block"
                            >
                              <Card className="p-2 hover:bg-accent transition-colors cursor-pointer">
                                <div className="flex gap-2">
                                  <img 
                                    src={imageUrl} 
                                    alt={product.name}
                                    className="w-16 h-16 object-cover rounded"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = '/placeholder.svg';
                                    }}
                                  />
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-medium text-sm truncate">{product.name}</h4>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {product.price ? `${new Intl.NumberFormat('vi-VN').format(product.price)} đ` : 'Liên hệ'}
                                      {product.originalPrice && product.originalPrice > product.price && (
                                        <span className="line-through ml-2 text-muted-foreground">
                                          {new Intl.NumberFormat('vi-VN').format(product.originalPrice)} đ
                                        </span>
                                      )}
                                    </p>
                                    {product.stock !== undefined && (
                                      <p className="text-xs text-muted-foreground">
                                        Còn {product.stock} {product.unit || 'sản phẩm'}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </Card>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                    
                    <span className="text-xs opacity-70 mt-1 block">
                      {message.timestamp.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  {message.sender === 'user' && (
                    <Avatar className="h-6 w-6 mt-1">
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        Bạn
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start gap-2">
                  <Avatar className="h-6 w-6 mt-1">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      AI
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-muted text-muted-foreground p-3 rounded-lg text-sm">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-current rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              {error && (
                <div className="flex items-start gap-2 p-2 bg-destructive/10 text-destructive text-xs rounded-lg">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Nhập tin nhắn..."
                  className="flex-1"
                  disabled={isTyping}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || isTyping}
                  size="icon"
                  className="bg-primary hover:bg-primary/90 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
};

export default ChatBox;