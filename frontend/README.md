# Writing Test App ✍️

Ứng dụng luyện thi kỹ năng Writing cho các bài thi KET, IELTS, PET.

## Tính năng
- Học sinh đăng ký và làm bài viết online
- Giáo viên chấm điểm, xem bài viết
- Quản lý nhiều đề thi (có thể có hình ảnh minh họa)
- Đếm giờ, đếm từ, tự nộp bài khi hết giờ

## Cài đặt local
```bash
cd backend
npm install

cd ../frontend
npm install
npm start

## Biến môi trường social login

Frontend dùng các biến sau để hiển thị nút đăng nhập nhanh:

```bash
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here
VITE_FACEBOOK_APP_ID=your_facebook_app_id_here
VITE_ZALO_APP_ID=your_zalo_app_id_here
# Optional nếu callback không phải /login
VITE_ZALO_REDIRECT_URI=http://localhost:3000/login
```

Backend phải dùng cùng Zalo App ID và giữ Zalo App Secret ở server:

```bash
ZALO_APP_ID=your_zalo_app_id_here
ZALO_APP_SECRET=your_zalo_app_secret_here
```
