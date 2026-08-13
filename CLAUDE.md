# TaskHub — Hướng dẫn cho Claude (đọc trước khi code)

TaskHub = quản lý công việc kiểu **Kanban** cho đội nhóm + **kho mật khẩu cá nhân** (mã hoá, khoá bằng PIN). Có gói **Premium** (thanh toán qua **PayOS**). Gồm **3 phần**: backend .NET, web React, và app mobile Expo — tất cả trong repo này.

> Người dùng nói tiếng Việt. Trả lời tiếng Việt.
> **KHÔNG tự commit/push.** Người dùng tự review & commit (xem memory `no-auto-commit`).

## Cấu trúc thư mục
- `taskhub-backend/` — **.NET Clean Architecture**: `TaskHub.API` (Controllers, Hubs SignalR, Workers), `TaskHub.Application` (Services, DTOs, Interfaces), `TaskHub.Domain` (Entities), `TaskHub.Persistence` (MongoDB). Deploy trên **Render**: `https://taskhub-system.onrender.com`.
- `taskhub-frontend/` — **React 19 + Vite + Tailwind v4**. Deploy Vercel. Dev: `npm run dev`.
- `taskhub-mobile/` — **Expo SDK 54 (React Native)**. Chạy bằng **EAS dev build** (KHÔNG phải Expo Go — xem mục Mobile).

## Quy ước chung
- **API base** = `/api` trên Render. Frontend `src/services/api.js` (axios). Mobile `src/api.js`.
- **Auth**: JWT. Web lưu ở `localStorage`, mobile ở `expo-secure-store`.
- **Mobile gửi header `X-Client-Type: mobile`** khi đăng nhập → backend **bỏ qua reCAPTCHA** (xem `AuthController.Login`). Web vẫn dùng reCAPTCHA.
- **Premium gating**: endpoint trả `403 { requiresUpgrade: true }` nếu chưa Premium. Các tính năng Premium: **Kho mật khẩu, Ngân sách dự án, AI (tóm tắt/phân tích), Tổng quan dự án (Project Analytics)**.
- **Màu thương hiệu**: gradient **teal `#14e1a3` → blue `#2563eb`**. Web remap scale `indigo`→blue trong `index.css`. Mobile: `src/theme.js` (`gradients.brand`), nút gradient dùng `components/GradientButton`.
- **Realtime**: SignalR hub `https://taskhub-system.onrender.com/hubs/project`, sự kiện `projectChanged`.

## Mobile — RẤT QUAN TRỌNG
- App chạy bằng **EAS development build** (APK cài trên máy), **không chạy Expo Go** vì có native modules: `@react-native-google-signin/google-signin`, `react-native-webview`, `expo-linear-gradient`, `react-native-safe-area-context`.
- **Thêm/đổi native module → BẮT BUỘC build lại**: `npx eas-cli@latest build --profile development --platform android` (~20–30 phút hàng chờ Free Tier). Sau đó gỡ app cũ, cài APK mới.
- **Chỉ đổi JS → không cần build lại**: `npx expo start --dev-client` rồi reload. Kết nối app bằng URL `http://<IP-máy>:8081` (đọc trong terminal, phần sau `url=`).
- **EXPO_TOKEN**: đặt bằng CMD `set EXPO_TOKEN=...` (KHÔNG dùng `$env:` của PowerShell). Token là Access Token tạo ở expo.dev.
- **Điều hướng**: tự viết bằng state trong `App.js` (`tab` + `stack` drill-down), KHÔNG dùng react-navigation. TabBar 5 mục. Màn drill-down: board, task, createTask, budget, projectDashboard, pricing, checkout, notifications, admin.
- **Google Sign-In**: Google Cloud project `taskhub-498107` (số `523086170118`). Web Client ID `523086170118-8hmdpvtjno80u4pp3cq1o6i9vddd7t0b.apps.googleusercontent.com` (backend `Google:ClientId` duyệt theo `aud` này). Android Client ID `523086170118-72n02l0n7p9mk7pv3j5ihg161kqclnhj...`. `webClientId` trong `src/google.js` = Web Client ID.
- Expo account: `tam3112`. EAS projectId trong `app.json`.

## Trạng thái hiện tại (tính tới cuối session trước)
- **Web** đã làm: đổi UI vibrant (gradient/sidebar/dashboard), sửa nội dung landing cho trung thực (bỏ tính năng chia sẻ tài khoản KHÔNG có thật + khách hàng bịa), trang **Báo cáo doanh thu** (`/admin/revenue`, xuất CSV + in PDF), trang **Tổng quan dự án** (`/projects/:id/dashboard`, Premium).
- **Mobile** đã làm (P1→P4 + hơn): đăng nhập (email/mật khẩu + Google) + đăng ký + quên mật khẩu, Dự án, Bảng Kanban realtime, tạo/sửa/xoá task, Việc của tôi, Tổng quan, Thông báo, Kho mật khẩu (PIN), Ngân sách, Nâng cấp + **QR thanh toán trong app** (WebView), Admin, Hồ sơ, **AI** (Dashboard/Task/Board), **gradient + icon vector + safe area**, **Tổng quan dự án** (Premium, gồm "Công việc mới tạo").
- **Backend vừa thêm**: trường `TaskItem.CreatedById` (người tạo task) + trả trong `TaskResponse` → **CẦN commit + push để Render deploy**. Task cũ không có người tạo (hiện "—").

## Việc còn treo (cần người dùng làm)
1. **Commit + push** toàn bộ (backend `createdById`, web, mobile) — người dùng tự làm.
2. **Deploy backend** (push → Render) để `createdById` có hiệu lực.
3. **Build lại mobile dev build** (đã thêm `react-native-safe-area-context` + `@expo/vector-icons`, và `expo-linear-gradient` chưa vào binary) → 1 lần build cuối cho giao diện.

## Gotchas
- `taskhub-frontend/.env.local` đang trỏ `VITE_API_PROXY` sang **Render** (để dev với dữ liệu thật). Đổi về `http://localhost:8080` nếu muốn backend local.
- `BACKEND_DOCUMENTATION.md` chứa **secret thật đã lộ** (nên đổi/thu hồi, không dùng làm nguồn chuẩn).
- Người dùng đang học môn **EXE201** (khởi nghiệp) — quan tâm bằng chứng doanh thu/khách hàng thật; KHÔNG dựng số liệu ảo.
