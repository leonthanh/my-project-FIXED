# my-project-FIXED

## Cài Đặt GitHub Secrets

Để triển khai dự án thành công, bạn cần cấu hình các GitHub Secrets sau trong repository:

1. Truy cập repository settings
2. Chọn "Secrets and variables" > "Actions"
3. Click "New repository secret"
4. Thêm các secrets sau:

### Required Secrets

| Secret Name | Mô tả |
|------------|--------|
| FTP_USERNAME | Username FTP cho cPanel |
| FTP_PASSWORD | Password FTP cho cPanel |

### Cách Thêm Secrets

1. FTP_USERNAME:
   - Name: `FTP_USERNAME`
   - Value: [Username FTP của bạn]
   - Click "Add secret"

2. FTP_PASSWORD:
   - Name: `FTP_PASSWORD`
   - Value: [Password FTP của bạn]
   - Click "Add secret"

## Xác Nhận Cài Đặt

Sau khi thêm secrets, GitHub Actions workflows sẽ có thể truy cập chúng một cách an toàn qua `${{ secrets.FTP_USERNAME }}` và `${{ secrets.FTP_PASSWORD }}`.

## Lưu ý cho triển khai backend

Workflow hiện tại không upload `node_modules` để tránh gửi hàng trăm nghìn file. Thay vào đó:

- `backend/package.json` và (tùy chọn) `backend/package-lock.json` phải tồn tại trong repo.
- Sau khi upload, workflow sẽ chạy script trên server (qua một file PHP) để thực hiện `npm ci --production` trên server cPanel.
- Đảm bảo server có Node/npm/PM2 và có quyền chạy các lệnh đó từ PHP (nếu không, bạn cần cài đặt thủ công hoặc dùng SSH).

Nếu server của bạn không cho phép chạy npm qua PHP, cân nhắc một trong các phương án:

- Chạy `npm ci` trên runner và upload một `backend-temp` đã chứa `node_modules` (không khuyến nghị vì lớn).
- Đặt một task cron/SSH để cài dependencies sau khi upload.
- Sử dụng SFTP/SSH deploy thay vì FTP để có khả năng chạy lệnh từ runner.
