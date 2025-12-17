import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: true, // Cho phép truy cập từ mạng nội bộ
    port: 8082,
    strictPort: false, // Không bắt buộc port, sẽ tự động tìm port khác nếu 8082 bị chiếm
    proxy: {
      "/api": {
        target: "http://localhost:8081",
        changeOrigin: true,
      },
      "/uploads": {
        target: "http://localhost:8081",
        changeOrigin: true,
      },
      "/ws": {
        target: "http://localhost:8081",
        changeOrigin: true,
        ws: true,
      },
    },
  },
  define: {
    global: "globalThis",
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
