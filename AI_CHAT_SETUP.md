# Hướng dẫn cấu hình AI Chat

ChatBox component đã được tích hợp với AI để hỗ trợ khách hàng tự động.

## Cách hoạt động

ChatBox sẽ tự động thử các phương thức sau theo thứ tự:

1. **Backend AI API** (nếu có): Gọi endpoint `/api/chat/ai` từ backend
2. **Google Gemini API** (nếu có API key): Sử dụng Gemini Pro/Flash - **Ưu tiên cao nhất**
3. **OpenAI API** (nếu có API key): Sử dụng OpenAI GPT-3.5-turbo
4. **Fallback thông minh**: Phản hồi dựa trên từ khóa nếu không có AI service

## Cấu hình

### Option 1: Sử dụng Google Gemini API (Khuyến nghị - Miễn phí với tài khoản Pro)

#### Bước 1: Lấy Gemini API Key và Kích hoạt API

1. Truy cập: https://aistudio.google.com/
2. Đăng nhập bằng tài khoản Google của bạn (tài khoản Pro nếu có)
3. Click **"Get API key"** hoặc vào **"API Keys"** trong menu
4. Chọn dự án hiện có hoặc tạo dự án mới
5. Click **"Create API key"**
6. **QUAN TRỌNG**: Copy key ngay lập tức!
   - Key có dạng: `AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

**⚠️ QUAN TRỌNG - Kích hoạt Generative Language API:**

Sau khi tạo API key, bạn **PHẢI** kích hoạt API trong Google Cloud Console:

1. Truy cập: https://console.cloud.google.com/
2. Chọn đúng dự án (project) mà bạn đã tạo API key
3. Vào **"APIs & Services"** → **"Library"**
4. Tìm kiếm: **"Generative Language API"**
5. Click vào và nhấn **"Enable"** (Kích hoạt)
6. Đợi vài phút để API được kích hoạt hoàn toàn

**Nếu không kích hoạt API này, bạn sẽ gặp lỗi 404 khi gọi Gemini API!**

#### Bước 2: Cấu hình trong project

1. Tạo file `.env` trong thư mục root của project (cùng cấp với `package.json`)
2. Thêm dòng sau vào file `.env`:

```env
VITE_GEMINI_API_KEY=AIzaSy-your-actual-key-here
```

**Tùy chọn**: Bạn có thể chọn model Gemini:
```env
VITE_GEMINI_API_KEY=AIzaSy-your-actual-key-here
VITE_GEMINI_MODEL=gemini-2.0-flash-exp  # hoặc gemini-1.5-pro, gemini-1.5-flash
```

Các model có sẵn:
- `gemini-2.0-flash-exp` - Mới nhất, nhanh và miễn phí (mặc định)
- `gemini-1.5-pro` - Mạnh mẽ hơn, tốt cho tài khoản Pro
- `gemini-1.5-flash` - Nhanh và hiệu quả

#### Bước 3: Khởi động lại dev server

```bash
# Dừng server hiện tại (Ctrl+C)
# Sau đó chạy lại
npm run dev
```

#### Ưu điểm của Gemini:
- ✅ **Miễn phí** với tài khoản Pro
- ✅ Tốc độ nhanh
- ✅ Hỗ trợ tiếng Việt tốt
- ✅ API đơn giản, dễ sử dụng

---

### Option 2: Sử dụng OpenAI API

#### Bước 1: Đăng ký/Đăng nhập tài khoản OpenAI

1. Truy cập: https://platform.openai.com/
2. Click **"Sign up"** để đăng ký hoặc **"Log in"** nếu đã có tài khoản
3. Bạn có thể đăng ký bằng:
   - Email
   - Google account
   - Microsoft account

#### Bước 2: Nạp tiền vào tài khoản (Billing)

1. Sau khi đăng nhập, vào **Settings** → **Billing**
2. Click **"Add payment method"** hoặc **"Add credits"**
3. Nạp tiền tối thiểu $5 (khoảng 120,000 VNĐ)
   - OpenAI tính phí theo usage (số lượng tin nhắn)
   - GPT-3.5-turbo rất rẻ: ~$0.0015 cho 1000 tokens (khoảng 750 từ)
   - $5 có thể dùng được rất nhiều cho mục đích test/development

#### Bước 3: Tạo API Key

1. Truy cập: https://platform.openai.com/api-keys
2. Click nút **"+ Create new secret key"**
3. Đặt tên cho key (ví dụ: "Harvest Hub Chat")
4. Click **"Create secret key"**
5. **QUAN TRỌNG**: Copy key ngay lập tức vì bạn sẽ không thấy lại được!
   - Key có dạng: `sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

#### Bước 4: Cấu hình trong project

1. Tạo file `.env` trong thư mục root của project (cùng cấp với `package.json`)
2. Thêm dòng sau vào file `.env`:

```env
VITE_OPENAI_API_KEY=sk-proj-your-actual-key-here
```

**Lưu ý quan trọng:**
- ⚠️ **KHÔNG** commit file `.env` lên Git! File này đã được thêm vào `.gitignore`
- ⚠️ **KHÔNG** chia sẻ API key với ai khác
- ⚠️ Nếu key bị lộ, hãy xóa và tạo key mới ngay lập tức

#### Bước 5: Khởi động lại dev server

Sau khi thêm `.env`, bạn cần khởi động lại server:

```bash
# Dừng server hiện tại (Ctrl+C)
# Sau đó chạy lại
npm run dev
# hoặc
yarn dev
```

#### Kiểm tra xem đã hoạt động chưa

1. Mở ChatBox trong ứng dụng
2. Gửi một tin nhắn test
3. Nếu thấy phản hồi thông minh từ AI (không phải fallback), nghĩa là đã thành công!

#### Chi phí ước tính

- **GPT-3.5-turbo**: ~$0.0015 / 1000 tokens
- Một cuộc hội thoại trung bình: ~500-1000 tokens
- Với $5: Có thể xử lý khoảng 3,000-6,000 cuộc hội thoại
- Rất phù hợp cho development và testing

---

### Option 3: Sử dụng Backend API

Nếu backend của bạn có endpoint AI chat tại `/api/chat/ai`, ChatBox sẽ tự động sử dụng nó.

Endpoint cần trả về JSON format:
```json
{
  "response": "Phản hồi từ AI",
  "message": "Phản hồi từ AI" // hoặc
}
```

Request body:
```json
{
  "message": "Tin nhắn từ người dùng",
  "history": [
    {
      "role": "user",
      "content": "Tin nhắn trước đó"
    },
    {
      "role": "assistant",
      "content": "Phản hồi trước đó"
    }
  ]
}
```

---

### Option 4: Sử dụng Fallback (Mặc định)

Nếu không cấu hình gì, ChatBox sẽ sử dụng hệ thống phản hồi thông minh dựa trên từ khóa. Hệ thống này có thể nhận diện các chủ đề phổ biến như:
- Chào hỏi
- Giá cả
- Đặt hàng
- Vận chuyển
- Đổi trả
- Sản phẩm
- Tài khoản
- Voucher

## Tính năng

- ✅ Tích hợp AI thông minh với nhiều phương thức fallback
- ✅ Hiển thị trạng thái đang gõ (typing indicator)
- ✅ Xử lý lỗi và thông báo người dùng
- ✅ Lịch sử hội thoại được lưu trong session
- ✅ UI đẹp với avatar và timestamp
- ✅ Responsive và dễ sử dụng

## Sử dụng

Component ChatBox đã sẵn sàng sử dụng. Chỉ cần import và thêm vào layout:

```tsx
import ChatBox from '@/components/chat/ChatBox';

// Trong component của bạn
<ChatBox />
```

Component sẽ tự động xử lý tất cả logic AI và giao diện người dùng.

