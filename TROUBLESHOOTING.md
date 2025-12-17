# Hướng dẫn khắc phục lỗi "Trang không hiển thị gì"

## Vấn đề
Khi truy cập `http://192.168.1.100:8082` từ thiết bị khác, trang web không hiển thị gì (màn hình đen).

## Các bước kiểm tra và khắc phục

### 1. Kiểm tra Vite Dev Server đang chạy

Đảm bảo frontend server đang chạy:
```bash
cd D:\harvest-hub-emporium-main
npm run dev
```

Khi server khởi động thành công, bạn sẽ thấy thông báo như:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:8082/
  ➜  Network: http://192.168.1.100:8082/
```

**Quan trọng**: Phải thấy dòng "Network: http://192.168.1.100:8082/" - điều này xác nhận server đang lắng nghe trên mạng nội bộ.

### 2. Kiểm tra Firewall

Windows Firewall có thể chặn kết nối. Thử tạm thời tắt firewall để kiểm tra:
- Mở Windows Defender Firewall
- Tắt firewall tạm thời
- Thử truy cập lại từ thiết bị khác

Nếu hoạt động sau khi tắt firewall, bạn cần thêm rule cho phép port 8082.

### 3. Kiểm tra Backend đang chạy

Backend phải đang chạy trên port 8081:
```bash
cd D:\harvest-hub-backend
# Chạy backend (tùy theo cách bạn chạy - Maven, Gradle, etc.)
```

### 4. Kiểm tra biến môi trường

Đảm bảo file `.env.local` có nội dung đúng:
```
VITE_API_BASE_URL=http://192.168.1.100:8081
```

**Lưu ý**: Nếu backend chạy trên port khác, cập nhật cho đúng.

### 5. Kiểm tra Console trong Browser

Trên thiết bị di động:
1. Mở Developer Tools (nếu có)
2. Hoặc kết nối thiết bị với máy tính và dùng Chrome DevTools Remote Debugging
3. Kiểm tra tab Console xem có lỗi JavaScript nào không

Các lỗi thường gặp:
- `ERR_CONNECTION_REFUSED` - Backend không chạy hoặc không thể truy cập
- `CORS error` - Vấn đề về CORS
- `Failed to fetch` - Không thể kết nối API

### 6. Kiểm tra Network Tab

Trong Developer Tools, kiểm tra tab Network:
- Xem các request có được gửi đi không
- Xem response status code
- Kiểm tra xem có request nào bị failed không

### 7. Kiểm tra IP Address

Đảm bảo IP address đúng:
```bash
# Trên Windows
ipconfig

# Tìm IPv4 Address của adapter đang dùng (WiFi hoặc Ethernet)
# Phải là 192.168.1.100
```

### 8. Thử truy cập từ máy tính khác trong cùng mạng

Thử truy cập `http://192.168.1.100:8082` từ trình duyệt trên máy tính khác trong cùng mạng để xác nhận vấn đề.

### 9. Kiểm tra Port có bị chiếm không

```bash
# Trên Windows
netstat -ano | findstr :8082

# Nếu có process đang dùng port, kiểm tra xem có phải Vite không
```

### 10. Khởi động lại Server

Sau khi thay đổi cấu hình:
1. Dừng server (Ctrl+C)
2. Xóa cache: `rm -rf node_modules/.vite` (hoặc xóa thư mục này trên Windows)
3. Khởi động lại: `npm run dev`

## Cấu hình đã được cập nhật

File `vite.config.ts` đã được cập nhật với:
- `host: true` - Cho phép truy cập từ mạng nội bộ
- `strictPort: false` - Tự động tìm port khác nếu 8082 bị chiếm

## Nếu vẫn không hoạt động

1. Kiểm tra log của Vite server xem có lỗi gì không
2. Thử thay đổi port trong `vite.config.ts` sang port khác (ví dụ: 3000, 5173)
3. Kiểm tra xem có proxy/VPN nào đang chạy không
4. Đảm bảo cả frontend và backend đều chạy trên cùng một máy hoặc có thể truy cập được từ mạng nội bộ
