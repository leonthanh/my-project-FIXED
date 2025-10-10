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
