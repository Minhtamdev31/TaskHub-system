# Triển khai & cấu hình secret (TaskHub)

## Nguyên tắc
- `appsettings.json` được commit **chỉ chứa config không nhạy cảm** (Issuer, DatabaseName, PublicUrl…). Mọi secret để trống.
- **Local dev:** đặt secret trong `appsettings.Development.json` (đã `.gitignore`, không bao giờ commit). .NET tự nạp đè khi `ASPNETCORE_ENVIRONMENT=Development`.
- **Production (Render):** đặt secret bằng **biến môi trường**. .NET map `Section:Key` ↔ env `Section__Key` (hai dấu gạch dưới).

## ⚠️ Bắt buộc: ROTATE các key đã lộ
Các secret dưới đây **đã từng commit vào lịch sử git** (vẫn xem được qua `git log`), nên phải tạo lại:
- MongoDB Atlas: đổi password user `sa` (hoặc tạo user mới) → cập nhật connection string.
- JWT `Secret`: sinh chuỗi ngẫu nhiên ≥ 32 ký tự.
- PayOS: tạo lại `ApiKey` / `ChecksumKey` trong dashboard PayOS.
- `Security:VaultEncryptionKey`: sinh khoá ngẫu nhiên mới. *Lưu ý: đổi khoá này sẽ làm các mật khẩu Vault đã mã hoá cũ không giải mã được — chỉ đổi nếu chấp nhận reset Vault.*

Sinh secret ngẫu nhiên nhanh:
```bash
openssl rand -base64 48
```

## Biến môi trường cần đặt trên Render
| Env var (Render)                   | Bí mật? | Ghi chú |
|------------------------------------|:------:|---------|
| `MongoDbSettings__ConnectionString`| ✅ | Connection string Atlas (sau khi rotate) |
| `Jwt__Secret`                      | ✅ | Ngẫu nhiên ≥ 32 ký tự |
| `Security__VaultEncryptionKey`     | ✅ | Khoá mã hoá Password Vault |
| `PayOS__ClientId`                  | ✅ | Credential PayOS |
| `PayOS__ApiKey`                    | ✅ | Credential PayOS |
| `PayOS__ChecksumKey`               | ✅ | Credential PayOS |
| `Groq__ApiKey`                     | ✅ | Nếu dùng tính năng AI |
| `EmailSettings__BrevoApiKey`       | ✅ | Nếu gửi email/OTP qua Brevo |

> Các giá trị **không nhạy cảm** (`Jwt__Issuer`, `MongoDbSettings__DatabaseName`, `Google__ClientId`, `App__PublicUrl`…) đã nằm sẵn trong `appsettings.json` nên **không cần** đặt lại trên Render, trừ khi muốn override.

## Seed tài khoản Admin
Đặt 3 biến sau → app tự tạo (hoặc nâng quyền) 1 tài khoản `Admin` **lúc khởi động**, idempotent (chạy lại nhiều lần không tạo trùng):

| Env var | Bí mật? | Ghi chú |
|---------|:------:|---------|
| `Admin__Email` | ⬜ | Email đăng nhập admin |
| `Admin__Username` | ⬜ | Tên hiển thị |
| `Admin__Password` | ✅ | Mật khẩu (được hash BCrypt khi tạo) |

- Nếu email đó **chưa có** → tạo user mới `Role="Admin"`, đã verify email.
- Nếu **đã có** user với email đó nhưng chưa phải Admin → **nâng lên Admin** (giữ nguyên mật khẩu cũ, bỏ qua `Admin__Password`).
- Không đặt đủ 3 biến → bỏ qua, log `Bỏ qua seed Admin`.
- **Sau khi tạo xong**, nên **xoá `Admin__Password`** khỏi Render để không lưu mật khẩu thô trong env (tài khoản vẫn còn trong DB).

## App sẽ fail-fast nếu thiếu cấu hình
`Program.cs` kiểm tra lúc khởi động và **dừng ngay với thông báo rõ ràng** nếu:
- Thiếu `MongoDbSettings__ConnectionString` hoặc `Security__VaultEncryptionKey`.
- Ở Production mà `Jwt__Secret` còn là placeholder/ngắn, hoặc `Security__VaultEncryptionKey` còn là giá trị mặc định.

Nếu deploy log báo `Thiếu cấu hình bắt buộc: ...` → vào Render → Environment → thêm đúng biến đó rồi redeploy.
