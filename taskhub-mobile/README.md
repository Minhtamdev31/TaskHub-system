# TaskHub Mobile (Expo / React Native)

App di động cho TaskHub, dùng chung API .NET đã deploy trên Render.
Bản hiện tại là **P1 — nền tảng + đăng nhập** (email/mật khẩu).

## Chạy thử trên điện thoại (Android + Expo Go)

1. Cài **Node.js** (đã có nếu bạn chạy được frontend web).
2. Cài app **Expo Go** trên điện thoại Android (từ Google Play).
3. Mở terminal trong thư mục này:

   ```bash
   cd taskhub-mobile
   npm install
   npx expo start
   ```

4. Nếu Expo báo lệch phiên bản SDK với Expo Go của bạn, chạy:

   ```bash
   npx expo install --fix
   ```

5. Một mã **QR** hiện ra trong terminal. Mở **Expo Go** trên điện thoại → **Scan QR code** → app sẽ tải và chạy.
   - Điện thoại và máy tính nên **cùng mạng Wi-Fi**. Nếu không kết nối được, trong terminal bấm `s` để đổi sang chế độ khác, hoặc chạy `npx expo start --tunnel`.

## Đăng nhập

- Dùng chính tài khoản trên web (email + mật khẩu).
- ⚠️ **Quan trọng**: App gọi backend trên Render và gửi header `X-Client-Type: mobile` để bỏ qua reCAPTCHA.
  Phần miễn reCAPTCHA này nằm ở `taskhub-backend/.../AuthController.cs` và **chỉ có hiệu lực sau khi bạn commit + push để Render deploy lại**.
  Trước khi deploy, đăng nhập email/mật khẩu trên app sẽ báo lỗi reCAPTCHA.

## Cấu trúc

```
taskhub-mobile/
├─ App.js                 # điều phối: chưa đăng nhập -> Login, đã đăng nhập -> Home
├─ src/
│  ├─ api.js              # axios + lưu token (expo-secure-store)
│  ├─ theme.js            # bảng màu đồng bộ web
│  └─ screens/
│     ├─ LoginScreen.js
│     └─ HomeScreen.js
├─ app.json, package.json, babel.config.js
```

## Lộ trình

- **P1 (xong)**: nền tảng + đăng nhập email/mật khẩu.
- **P2**: danh sách Dự án + Bảng công việc (Kanban) + chi tiết task.
- **P3**: My Tasks, Dashboard, Lịch, Thông báo realtime, Hồ sơ.
- **P4**: Kho mật khẩu (PIN), Ngân sách, Pricing/Thanh toán, Cài đặt, Admin, đăng nhập Google.
