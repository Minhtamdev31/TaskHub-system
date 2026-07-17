import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  // Mặc định proxy về backend đã deploy. Muốn chạy backend local thì đặt
  // VITE_API_PROXY=http://localhost:5036 trong taskhub-frontend/.env.local
  // (file này đã được .gitignore).
  const apiTarget = env.VITE_API_PROXY || "https://taskhub-system.onrender.com";

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5174,
      proxy: {
        "/api": {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
