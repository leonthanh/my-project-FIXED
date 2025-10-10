# Hướng Dẫn cho AI Agent về Nền Tảng Kiểm Tra Writing

## Tổng Quan Dự Án
Đây là nền tảng kiểm tra writing và listening được xây dựng bằng React (frontend) và Express.js (backend). Cho phép học sinh làm bài kiểm tra writing và listening có giới hạn thời gian, đồng thời giáo viên có thể xem xét và chấm điểm bài làm.

## Kiến Trúc

### Frontend (`/frontend`)
- SPA sử dụng React 18 và React Router v6
- Các component chính:
  - `WritingTest.jsx`: Giao diện kiểm tra chính với bố cục màn hình chia đôi (thích ứng)
  - `ListeningTest.jsx`: Giao diện kiểm tra có âm thanh
  - Giao diện Student/Teacher với định tuyến dựa trên vai trò
- Cấu hình môi trường trong `.env` với `REACT_APP_API_URL` cho production
- Sử dụng `react-quill` cho soạn thảo văn bản và `react-split` cho bố cục

### Backend (`/backend`)
- Server Express.js với các route có cấu trúc:
  - `/api/auth`: Xác thực (dựa trên JWT)
  - `/api/writing-tests`, `/api/listening-tests`: Quản lý bài kiểm tra
  - `/api/writing`: Xử lý nộp bài với tải file
  - `/api/ai`: Route tích hợp AI
- Cơ sở dữ liệu MySQL sử dụng Sequelize ORM
- Triển khai production qua PM2

## Các Mẫu và Quy Ước Chính

### Quản Lý Trạng Thái
- Local storage cho trạng thái kiểm tra:
  ```javascript
  writing_task1, writing_task2  // Câu trả lời hiện tại
  writing_timeLeft             // Thời gian còn lại
  writing_started             // Thời điểm bắt đầu kiểm tra
  user                       // Dữ liệu phiên
  ```

### Cấu Hình Môi Trường
- Cài đặt Development vs Production trong `db.js`:
  ```javascript
  isProd ? process.env.PROD_DB_NAME : process.env.DB_NAME
  isProd ? process.env.PROD_DB_USER : process.env.DB_USER
  ```

### Mẫu Triển Khai
- Quy trình GitHub Actions (`deploy.yml`):
  1. Build frontend với URL API production
  2. Triển khai FTP thông minh - chỉ các file đã thay đổi
  3. Package backend tối thiểu với dependencies production
  4. Quản lý quy trình bằng PM2 để cập nhật không gián đoạn

## Quy Trình Phát Triển

### Cài Đặt Local
```bash
# Backend
cd backend
npm install
# Thiết lập .env với DB_HOST, DB_NAME, DB_USER, DB_PASS
npm start  # Chạy trên cổng 5000

# Frontend
cd frontend
npm install
# Tạo .env với REACT_APP_API_URL=http://localhost:5000/api
npm start  # Chạy trên cổng 3000
```

### Quản Lý Cơ Sở Dữ Liệu
- Models trong `backend/models/` định nghĩa schema
- Tự động đồng bộ trong `server.js`:
  ```javascript
  sequelize.sync({ alter: true })
  ```
- Thông tin xác thực DB production trong cPanel MySQL

## Điểm Tích Hợp

### Quy Trình Tải File
1. Multer xử lý uploads vào `/backend/uploads/`
2. Files được phục vụ tĩnh qua route `/uploads`
3. Frontend tạo URL đầy đủ sử dụng `REACT_APP_API_URL`

### Hệ Thống Xác Thực
- JWT tokens lưu trong localStorage
- Routes dựa trên vai trò kiểm tra `user.role` ở frontend
- Routes API được bảo vệ sử dụng middleware auth

## Xử Lý Sự Cố
- Vấn đề triển khai: Kiểm tra logs PM2 qua terminal cPanel
- Vấn đề đồng bộ DB: So sánh thay đổi model với schema production
- Build thất bại: Đảm bảo tương thích Node 16.x