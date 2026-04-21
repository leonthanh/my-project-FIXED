# my-project-FIXED

## Deploy Production

Workflow production hiện tại nằm ở `.github/workflows/deploy.yml` và deploy bằng GitHub Actions + FTP mirror, không dùng `git pull` trên cPanel.

### Trigger

- `push` vào branch `main`
- Chạy tay bằng `workflow_dispatch` trong tab Actions
- `Squash and merge` PR vào `main` cũng trigger deploy vì GitHub tạo commit mới trên `main`

### Workflow hiện tại làm gì

- Frontend được build trong CI bằng `npm ci` và `npm run build`
- Frontend sau đó được mirror từ `frontend/dist/` lên `/ix.star-siec.edu.vn/frontend/build/` với chế độ `--delete`, nên file build cũ bị xóa trên server
- Backend được đóng gói source, tạo `.env` từ GitHub Secrets, rồi mirror lên `/ix.star-siec.edu.vn/backend/` với chế độ `--delete`
- Deploy backend giữ nguyên `uploads` và không upload `node_modules`
- Sau khi backend deploy xong, bạn vẫn phải restart Node.js App thủ công trong cPanel

## GitHub Secrets

Workflow hiện tại đọc các secrets sau trong GitHub Actions:

| Secret Name | Mục đích |
|------------|----------|
| FTP_USERNAME | Tài khoản FTP để upload frontend và backend lên cPanel |
| FTP_PASSWORD | Mật khẩu FTP để deploy lên cPanel |
| DB_HOST | Host MySQL production |
| DB_NAME | Tên database production |
| DB_USER | User database production |
| DB_PASS | Mật khẩu database production |
| JWT_ACCESS_SECRET | Secret ký access token production |
| JWT_REFRESH_SECRET | Secret ký refresh token production |
| FRONTEND_URL | Domain frontend production cho CORS và link runtime |
| REACT_APP_API_URL | URL API production được ghi vào env deploy |
| EMAIL_USER | Tài khoản email dùng ở production |
| EMAIL_PASS | Mật khẩu hoặc app password email production |
| EMAIL_TO | Email nhận thông báo mặc định |
| OPENAI_API_KEY | OpenAI key cho tính năng AI ở production |
| GEMINI_API_KEY | Gemini key cho tính năng AI ở production |

## Checklist Deploy Nhanh

1. Merge PR bằng `Squash and merge` vào `main` hoặc push trực tiếp vào `main`.
2. Vào tab Actions và chờ workflow `Deploy to cPanel` chạy xong.
3. Nếu `backend/package.json` vừa đổi, cập nhật dependencies trên server bằng cPanel Terminal hoặc SSH.
4. Vào cPanel → Setup Node.js App → chọn app → `Restart`.
5. Smoke check `https://ix.star-siec.edu.vn` và `https://ix.star-siec.edu.vn/api/reading-tests`.

## Lưu ý cho backend deploy

- Workflow hiện tại không chạy PHP deploy script và không chạy `npm install` hoặc `npm ci` trên server.
- Nếu backend thêm package mới mà server chưa có trong `node_modules`, bạn phải tự cập nhật dependencies trên host trước hoặc ngay sau khi restart app.
- Vì backend deploy dùng `--delete`, các file source đã xóa khỏi repo sẽ bị xóa trên server ở lần deploy tiếp theo.
- Thư mục `uploads` được giữ nguyên, nên deploy code không làm mất file upload đang có trên production.
