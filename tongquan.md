Tổng quan dự án: Nền tảng Học và Kiểm tra Tiếng Anh
Mô tả chung
Ứng dụng web full-stack phục vụ việc dạy và thi tiếng Anh (hướng đến học sinh Việt Nam). Giáo viên tạo đề thi; học sinh làm bài và nhận kết quả chấm điểm tự động cùng phản hồi từ AI. Tập trung vào định dạng đề thi Cambridge (KET, PET, Movers) và các dạng bài Reading, Listening, Writing tùy chỉnh.

Công nghệ sử dụng

Frontend

Thành phần	Công nghệ
Framework	React 18
Build tool	Vite
Routing	React Router v6
Giao diện	TailwindCSS + Bootstrap 5
Soạn thảo văn bản	CKEditor 5 / React-Quill
HTTP client	Axios
Kiểm thử E2E	Playwright
Unit test	Jest + React Testing Library

Backend

Thành phần	Công nghệ
Runtime	Node.js
Framework	Express 5
ORM	Sequelize 6
Cơ sở dữ liệu	MySQL
Xác thực	JWT (access + refresh token), bcryptjs
Validation	Zod
Upload file	Multer
Email	Nodemailer (Gmail App Passwords)
AI	OpenAI API
Logging	Pino
Bảo mật	Helmet, express-rate-limit, CORS

Kiến trúc hệ thống
my-project-FIXED/
├── backend/          Express API server + Sequelize models
│   ├── models/       Định nghĩa bảng dữ liệu (MySQL)
│   ├── routes/       Các route RESTful API
│   ├── middlewares/  Xác thực, validation, xử lý lỗi, phân quyền
│   └── server.js     Entry point; phục vụ React build trong production
└── frontend/         React SPA (Single Page Application)
    └── src/
        ├── features/ Module theo tính năng (auth, reading, writing, listening, cambridge, admin)
        └── shared/   Component dùng chung, ProtectedRoute
Backend phục vụ luôn bản build React — không cần host tĩnh riêng. Triển khai lên cPanel/shared hosting qua GitHub Actions + FTP.

Tính năng chính
Module	Mô tả
Xác thực	Đăng ký/đăng nhập bằng số điện thoại + mật khẩu, xác minh email OTP, xoay vòng refresh token
Writing Tests	Giáo viên tạo đề viết (có thể đính kèm hình ảnh); học sinh nộp bài luận
Reading Tests	Bài thi đọc hiểu nhiều đoạn văn, chấm điểm tự động
Listening Tests	Bài thi nghe với audio theo từng phần, hỗ trợ tự động lưu tiến trình
Cambridge Tests	Định dạng đề thi KET, PET, Movers cho cả Reading và Listening; đầy đủ CRUD + chấm lại
AI Feedback	Phản hồi bài viết tự động sử dụng OpenAI API
Admin Panel	Quản lý người dùng, phân quyền, xem toàn bộ bài nộp
Upload file	Lưu trữ hình ảnh và audio tại backend/uploads/ qua Multer
Xác thực & Phân quyền
JWT dual-token: Access token ngắn hạn (Bearer header) + Refresh token dài hạn (lưu DB, mã hóa bcrypt), xoay vòng mỗi lần refresh.
3 vai trò: student | teacher | admin.
requireTestPermission: Quyền hạt nhân — chỉ giáo viên có canManageTests = true hoặc admin mới tạo/sửa đề Reading, Listening, Cambridge.
Rate limiting trên các endpoint auth (50 req/10 phút, 10 req/10 phút với OTP).
Điểm nổi bật kỹ thuật
Cấu trúc frontend theo tính năng (feature-based): mỗi module có pages/, components/, hooks/, utils/ riêng.
Lazy loading routes: Tất cả page dùng React.lazy() để tối ưu tải trang.
Tự động refresh token ở frontend: mỗi 10 phút và khi tab được kích hoạt lại.
JSON column lưu nội dung đề thi phức tạp (câu hỏi, đoạn văn, audio URL) — tránh tạo quá nhiều bảng quan hệ.
Zod validation middleware: Kiểm tra input đầu vào tại tầng route.
CI/CD: GitHub Actions tự động FTP lên cPanel khi push code.