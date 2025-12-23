const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || "";
const API_PREFIX = API_BASE_URL ? `${API_BASE_URL}/api` : "/api";

// AI Chat Service - Hỗ trợ Google Gemini, OpenAI API hoặc backend API
export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

export interface ChatProduct {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  stock: number;
  unit?: string;
  category?: string;
  description?: string;
  shortDescription?: string;
  image?: string;
}

export interface ChatResponse {
  message: string;
  response?: string;
  products?: ChatProduct[];
  error?: string;
}

const authHeaders = () => {
  const token = localStorage.getItem("token");
  return token
    ? {
        Authorization: `Bearer ${token}`,
      }
    : {};
};

// Hàm gọi AI API từ backend (nếu có)
const callBackendAI = async (message: string, conversationHistory: ChatMessage[]): Promise<string> => {
  try {
    console.log("📤 Gửi tin nhắn đến backend:", message);
    const response = await fetch(`${API_PREFIX}/chat/ai`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify({
        message,
        history: conversationHistory.map(msg => ({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.text
        }))
      }),
    });

    console.log("📥 Response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Backend AI error:", response.status, errorText);
      throw new Error(`Lỗi HTTP! Mã trạng thái: ${response.status}`);
    }

    const data = await response.json();
    console.log("✅ Backend AI response:", data);
    
    // Xử lý cả ApiResponse format và format trực tiếp
    let responseData: ChatResponse;
    if (data.data) {
      responseData = {
        message: data.data.response || data.data.message || "Xin lỗi, tôi không thể trả lời câu hỏi này.",
        response: data.data.response || data.data.message,
        products: data.data.products || []
      };
    } else {
      responseData = {
        message: data.response || data.message || "Xin lỗi, tôi không thể trả lời câu hỏi này.",
        response: data.response || data.message,
        products: data.products || []
      };
    }
    
    console.log("📝 Extracted response:", responseData.message);
    if (responseData.products && responseData.products.length > 0) {
      console.log("📦 Products found:", responseData.products.length);
    }
    
    // Trả về dạng string với products embedded (sẽ parse ở ChatBox)
    return JSON.stringify(responseData);
  } catch (error) {
    console.error("❌ Backend AI API error:", error);
    throw error;
  }
};

// Hàm gọi Google Gemini API (nếu có API key)
const callGemini = async (message: string, conversationHistory: ChatMessage[]): Promise<string> => {
  const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error("Chưa cấu hình Gemini API key");
  }

  // Thử lấy danh sách models có sẵn để tìm model hợp lệ
  let availableModels: string[] = [];
  try {
    const listUrl = `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`;
    const listResponse = await fetch(listUrl);
    
    if (listResponse.ok) {
      const listData = await listResponse.json();
      availableModels = (listData.models || [])
        .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
        .map((m: any) => m.name?.replace('models/', '') || '')
        .filter(Boolean);
      console.log('Available Gemini models:', availableModels);
    } else {
      const errorData = await listResponse.json().catch(() => ({}));
      if (listResponse.status === 403 || listResponse.status === 401) {
        throw new Error("Gemini API key không hợp lệ hoặc chưa được kích hoạt Generative Language API. Vui lòng kiểm tra trong Google Cloud Console: https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com");
      }
    }
  } catch (checkError) {
    console.warn("Could not list models, will try default models:", checkError);
  }

  try {
    // System instruction - đưa vào như một phần của context
    const systemPrompt = "Bạn là một trợ lý AI thân thiện và chuyên nghiệp cho một cửa hàng nông sản trực tuyến tên là Harvest Hub. Bạn có thể hỗ trợ khách hàng về:\n- Thông tin sản phẩm nông sản (rau củ, trái cây, hạt giống, dụng cụ nông nghiệp)\n- Hướng dẫn đặt hàng và thanh toán\n- Chính sách vận chuyển và đổi trả\n- Tư vấn về sản phẩm phù hợp\n- Giải đáp thắc mắc về đơn hàng\n\nHãy trả lời một cách thân thiện, ngắn gọn và hữu ích bằng tiếng Việt.";

    // Chuẩn bị lịch sử hội thoại cho Gemini
    const contents: any[] = [];
    
    // Nếu đây là tin nhắn đầu tiên, thêm system prompt vào đầu message
    const userMessage = conversationHistory.length === 0 
      ? `${systemPrompt}\n\nNgười dùng: ${message}`
      : message;

    // Thêm lịch sử hội thoại
    conversationHistory.forEach(msg => {
      contents.push({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
      });
    });

    // Thêm tin nhắn hiện tại
    contents.push({
      role: 'user',
      parts: [{ text: userMessage }]
    });

    // Sử dụng model Gemini - ưu tiên models có sẵn, sau đó thử các model mặc định
    const defaultModels = [
      (import.meta as any).env?.VITE_GEMINI_MODEL, // Model từ env nếu có
      "gemini-pro",         // Model cơ bản, phổ biến nhất
      "gemini-1.5-pro",    // Mạnh mẽ hơn
      "gemini-1.5-flash",   // Nhanh và miễn phí
      "gemini-1.5-pro-latest", // Version mới nhất
      "gemini-1.5-flash-latest" // Version mới nhất
    ].filter(Boolean);
    
    // Nếu có danh sách models có sẵn, ưu tiên dùng chúng
    const models = availableModels.length > 0 
      ? [...defaultModels.filter(m => availableModels.includes(m)), ...defaultModels]
      : defaultModels;
    
    let lastError: Error | null = null;
    
    for (const model of models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`;

        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: contents,
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 500,
            },
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMsg = errorData.error?.message || `HTTP error! status: ${response.status}`;
          
          // Nếu là lỗi 404 (model không tồn tại), thử model tiếp theo
          if (response.status === 404 && models.indexOf(model) < models.length - 1) {
            console.log(`Model ${model} not found, trying next model...`);
            lastError = new Error(errorMsg);
            continue;
          }
          
          throw new Error(errorMsg);
        }

        const data = await response.json();
        const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!responseText) {
          throw new Error("Không nhận được phản hồi từ Gemini API");
        }

        return responseText;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        // Nếu không phải lỗi 404 hoặc đã thử hết models, throw error
        if (models.indexOf(model) === models.length - 1) {
          throw lastError;
        }
      }
    }
    
    throw lastError || new Error("All Gemini models failed");
  } catch (error) {
    console.error("Gemini API error:", error);
    throw error;
  }
};

// Hàm gọi OpenAI API trực tiếp (nếu có API key)
const callOpenAI = async (message: string, conversationHistory: ChatMessage[]): Promise<string> => {
  const apiKey = (import.meta as any).env?.VITE_OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error("Chưa cấu hình OpenAI API key");
  }

  try {
    const messages = [
      {
        role: "system",
        content: "Bạn là một trợ lý AI thân thiện và chuyên nghiệp cho một cửa hàng nông sản trực tuyến tên là Harvest Hub. Bạn có thể hỗ trợ khách hàng về:\n- Thông tin sản phẩm nông sản (rau củ, trái cây, hạt giống, dụng cụ nông nghiệp)\n- Hướng dẫn đặt hàng và thanh toán\n- Chính sách vận chuyển và đổi trả\n- Tư vấn về sản phẩm phù hợp\n- Giải đáp thắc mắc về đơn hàng\n\nHãy trả lời một cách thân thiện, ngắn gọn và hữu ích bằng tiếng Việt."
      },
      ...conversationHistory.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text
      })),
      {
        role: "user",
        content: message
      }
    ];

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: messages,
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || "Xin lỗi, tôi không thể trả lời câu hỏi này.";
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw error;
  }
};

// Hàm fallback với phản hồi thông minh dựa trên từ khóa
const getFallbackResponse = (message: string): string => {
  const lowerMessage = message.toLowerCase();
  
  // Phát hiện các chủ đề phổ biến
  if (lowerMessage.includes('chào') || lowerMessage.includes('hello') || lowerMessage.includes('xin chào')) {
    return 'Xin chào! Tôi là trợ lý AI của Harvest Hub. Tôi có thể giúp bạn tìm hiểu về sản phẩm nông sản, đặt hàng, hoặc giải đáp thắc mắc. Bạn cần hỗ trợ gì hôm nay?';
  }
  
  if (lowerMessage.includes('giá') || lowerMessage.includes('price') || lowerMessage.includes('cost')) {
    return 'Bạn có thể xem giá sản phẩm trực tiếp trên trang sản phẩm. Nếu bạn đang quan tâm đến một sản phẩm cụ thể, vui lòng cho tôi biết tên sản phẩm để tôi có thể hỗ trợ tốt hơn.';
  }
  
  if (lowerMessage.includes('đặt hàng') || lowerMessage.includes('mua') || lowerMessage.includes('order')) {
    return 'Để đặt hàng, bạn có thể:\n1. Thêm sản phẩm vào giỏ hàng\n2. Chọn phương thức thanh toán\n3. Xác nhận đơn hàng\n\nBạn cần hỗ trợ thêm về bước nào không?';
  }
  
  if (lowerMessage.includes('vận chuyển') || lowerMessage.includes('ship') || lowerMessage.includes('giao hàng')) {
    return 'Chúng tôi hỗ trợ giao hàng toàn quốc. Thời gian giao hàng thường từ 2-5 ngày làm việc tùy theo khu vực. Phí vận chuyển sẽ được tính dựa trên địa chỉ giao hàng của bạn.';
  }
  
  if (lowerMessage.includes('đổi trả') || lowerMessage.includes('hoàn') || lowerMessage.includes('refund')) {
    return 'Chúng tôi chấp nhận đổi trả trong vòng 7 ngày kể từ ngày nhận hàng nếu sản phẩm còn nguyên vẹn, chưa sử dụng. Vui lòng liên hệ hotline hoặc email để được hỗ trợ đổi trả.';
  }
  
  if (lowerMessage.includes('sản phẩm') || lowerMessage.includes('product') || lowerMessage.includes('hàng')) {
    return 'Chúng tôi có nhiều loại sản phẩm nông sản như rau củ tươi, trái cây, hạt giống, và dụng cụ nông nghiệp. Bạn có thể duyệt danh mục sản phẩm trên trang chủ để tìm sản phẩm phù hợp.';
  }
  
  if (lowerMessage.includes('tài khoản') || lowerMessage.includes('account') || lowerMessage.includes('đăng nhập')) {
    return 'Bạn có thể đăng nhập hoặc đăng ký tài khoản mới ở góc trên bên phải trang web. Nếu gặp vấn đề, vui lòng liên hệ bộ phận hỗ trợ.';
  }
  
  if (lowerMessage.includes('voucher') || lowerMessage.includes('mã giảm giá') || lowerMessage.includes('khuyến mãi')) {
    return 'Chúng tôi thường xuyên có các chương trình khuyến mãi và voucher giảm giá. Bạn có thể xem các voucher hiện có trong phần "Voucher của tôi" sau khi đăng nhập.';
  }
  
  // Phản hồi mặc định
  return 'Cảm ơn bạn đã liên hệ! Tôi hiểu bạn đang hỏi về: "' + message + '". Để tôi có thể hỗ trợ tốt hơn, bạn có thể:\n- Mô tả chi tiết hơn về vấn đề\n- Liên hệ hotline: 1900-xxxx\n- Gửi email: support@harvesthub.com\n\nTôi có thể giúp bạn về sản phẩm, đặt hàng, vận chuyển, hoặc các vấn đề khác. Bạn cần hỗ trợ gì cụ thể?';
};

export const chatService = {
  /**
   * Gửi tin nhắn và nhận phản hồi từ AI
   * Trả về string (có thể là JSON string nếu có products)
   */
  async sendMessage(message: string, conversationHistory: ChatMessage[]): Promise<string> {
    try {
      // Thử gọi backend AI API trước
      try {
        return await callBackendAI(message, conversationHistory);
      } catch (backendError) {
        console.log("Backend AI not available, trying Gemini...");
        
        // Ưu tiên Gemini nếu có API key
        try {
          return await callGemini(message, conversationHistory);
        } catch (geminiError) {
          console.log("Gemini not available, trying OpenAI...");
          
          // Thử OpenAI nếu Gemini không có
          try {
            return await callOpenAI(message, conversationHistory);
          } catch (openAIError) {
            console.log("OpenAI not available, using fallback...");
            // Fallback về phản hồi thông minh dựa trên từ khóa
            return getFallbackResponse(message);
          }
        }
      }
    } catch (error) {
      console.error("Chat service error:", error);
      // Trả về phản hồi fallback nếu tất cả đều thất bại
      return getFallbackResponse(message);
    }
  },

  /**
   * Kiểm tra xem AI service có sẵn sàng không
   */
  async checkAvailability(): Promise<boolean> {
    try {
      // Kiểm tra backend API
      const response = await fetch(`${API_PREFIX}/chat/health`, {
        method: "GET",
        headers: authHeaders(),
      });
      return response.ok;
    } catch {
      // Kiểm tra Gemini API key trước (ưu tiên)
      const geminiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
      if (geminiKey) return true;
      
      // Kiểm tra OpenAI API key
      const openAIKey = (import.meta as any).env?.VITE_OPENAI_API_KEY;
      return !!openAIKey;
    }
  }
};

