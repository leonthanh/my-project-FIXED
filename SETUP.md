# 📋 Setup & Development Guide

## 📖 Mục Lục

1. [Clone Repo](#clone-repo)
2. [Setup Backend](#setup-backend)
3. [Setup Frontend](#setup-frontend)
4. [OpenAI API Configuration](#openai-api-configuration)
5. [GitHub Secrets Setup](#github-secrets-setup)
6. [Database Setup (XAMPP)](#database-setup-xampp)
7. [Git Workflow](#git-workflow)
8. [Deploy to cPanel](#deploy-to-cpanel)

---

## 🔄 Clone Repo

```bash
git clone https://github.com/leonthanh/my-project-FIXED.git
cd my-project-FIXED
```

---

## 🖥️ Setup Backend

### Cài đặt Dependencies

```bash
cd backend
npm install
```

### Tạo file `.env`

Tạo file `backend/.env` với nội dung:

```env
DB_HOST=localhost
DB_NAME=wsxcblqh_ix
DB_USER=wsxcblqh_thanh
DB_PASS=
NODE_ENV=development
PORT=5000
EMAIL_USER=stareduelt@gmail.com
EMAIL_PASS=
EMAIL_TO=
REACT_APP_API_URL=http://localhost:5000
GEMINI_API_KEY=your_gemini_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
```

### Chạy Backend

```bash
npm start
# Hoặc dùng nodemon (tự reload khi thay đổi code)
npx nodemon server.js
```

Backend sẽ chạy ở: `http://localhost:5000`

---

## 🎨 Setup Frontend

### Cài đặt Dependencies

```bash
cd frontend
npm install
```

### Chạy Frontend

```bash
npm start
```

Frontend sẽ chạy ở: `http://localhost:3000`

---

## 🤖 OpenAI API Configuration

### 1. Tạo API Key

- Vào: https://platform.openai.com/api-keys
- Click "Create new secret key"
- Copy key vừa tạo
- **Lưu ý:** Không bao giờ share public key này!

### 2. Cập nhật `.env` Local

```bash
# backend/.env
OPENAI_API_KEY=your_openai_api_key_here
```

### 3. Test AI Feature

- Vào frontend: `http://localhost:3000`
- Đăng nhập với tài khoản GV
- Click nút "🤖 StarEdu AI gợi ý nhận xét"
- Nếu thành công → AI sẽ trả về nhận xét chi tiết

---

## 🔐 GitHub Secrets Setup

### Thêm Secrets vào GitHub

1. Vào repo: `https://github.com/leonthanh/my-project-FIXED`
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **"New repository secret"**
4. Thêm các secrets mà `deploy.yml` hiện đang dùng:

| Name | Mục đích |
| ---- | -------- |
| `FTP_USERNAME` | Tài khoản FTP để upload frontend và backend lên cPanel |
| `FTP_PASSWORD` | Mật khẩu FTP để deploy lên cPanel |
| `DB_HOST` | Host MySQL production |
| `DB_NAME` | Tên database production |
| `DB_USER` | User database production |
| `DB_PASS` | Mật khẩu database production |
| `JWT_ACCESS_SECRET` | Secret ký access token production |
| `JWT_REFRESH_SECRET` | Secret ký refresh token production |
| `FRONTEND_URL` | Domain frontend production cho CORS và runtime links |
| `REACT_APP_API_URL` | URL API production được ghi vào env deploy |
| `EMAIL_USER` | Tài khoản email dùng ở production |
| `EMAIL_PASS` | Mật khẩu hoặc app password email production |
| `EMAIL_TO` | Email nhận thông báo mặc định |
| `OPENAI_API_KEY` | OpenAI key cho tính năng AI ở production |
| `GEMINI_API_KEY` | Gemini key cho tính năng AI ở production |

### ⚠️ Quan trọng

- **KHÔNG bao giờ commit API Keys vào GitHub**
- Luôn dùng `.gitignore` để bỏ qua file `.env`
- Secrets được lưu **an toàn** ở GitHub và được workflow dùng để tạo `.env` production khi deploy

---

## 🗄️ Database Setup (XAMPP)

### 1. Cài đặt XAMPP

- Download từ: https://www.apachefriends.org/
- Cài đặt, bật Apache + MySQL

### 2. Tạo Database

1. Mở phpMyAdmin: `http://localhost/phpmyadmin`
2. Click **"New"**
3. Tạo database: `wsxcblqh_ix`
4. Character set: `utf8mb4_unicode_ci`

### 3. Tạo User MySQL

1. Vào **"User accounts"**
2. Click **"Add user account"**
3. Nhập:
   - **Username:** `wsxcblqh_thanh`
   - **Host:** `localhost`
   - **Password:** `xxxxx`
4. Click **Go**

### 4. Cấp quyền

- Chọn user vừa tạo
- Cấp **"All privileges"** cho database `wsxcblqh_ix`

---

## 📝 Git Workflow

### ✅ Quy trình làm việc chuẩn

#### **Khi vào chỗ làm (sáng hôm sau)**

```bash
cd d:/web-app/my-project-FIXED

# LUÔN pull trước!
git pull origin main

# Code của bạn...
```

#### **Khi xong code**

```bash
# Xem thay đổi
git status

# Thêm files
git add .

# Commit với message rõ ràng
git commit -m "Thêm feature XYZ"
# Hoặc
git commit -m "Fix lỗi ABC"

# Push lên GitHub
git push origin main
```

#### **Khi sang PC khác (nhà)**

```bash
# Trước khi code
git pull origin main

# Code...

# Commit & push
git add .
git commit -m "..."
git push origin main
```

### Nếu deploy qua Pull Request

- Bạn có thể làm việc trên branch feature rồi tạo PR vào `main`.
- Khi bấm **Squash and merge**, GitHub tạo commit mới trên `main`, nên workflow deploy vẫn tự chạy như `git push origin main`.

### ⚠️ Lưu ý quan trọng

- **LUÔN `git pull` trước** khi bắt đầu code
- Tránh xung đột (conflict) khi 2 người code cùng lúc
- Commit message nên **rõ ràng, ngắn gọn**

---

## 🚀 Deploy to cPanel

### Workflow tự động hiện tại

- Workflow production nằm ở `.github/workflows/deploy.yml`.
- Deploy tự chạy khi có `push` vào `main`.
- Nếu bạn merge PR bằng **Squash and merge**, GitHub tạo commit mới trên `main`, nên workflow cũng tự chạy.
- Bạn cũng có thể chạy tay bằng `workflow_dispatch` trong tab Actions.
- Flow này deploy bằng GitHub Actions + FTP mirror, không cần `git pull` trên cPanel.

### Checklist deploy nhanh

1. Merge PR bằng **Squash and merge** vào `main` hoặc push trực tiếp vào `main`.
2. Vào `https://github.com/leonthanh/my-project-FIXED` → tab **Actions** → chờ workflow **Deploy to cPanel** chạy xong.
3. Nếu `backend/package.json` vừa đổi, cập nhật dependencies trên server bằng cPanel Terminal hoặc SSH.
4. Đăng nhập cPanel → **Setup Node.js App** → chọn app → **Restart**.
5. Smoke check `https://ix.star-siec.edu.vn` và `https://ix.star-siec.edu.vn/api/reading-tests`.

### Workflow này thực hiện gì

- Frontend được build trong CI bằng `npm ci` và `npm run build`.
- Frontend sau đó được mirror lên `/ix.star-siec.edu.vn/frontend/build/` với chế độ `--delete`, nên file build cũ bị xóa trên server.
- Backend được đóng gói source, tạo `.env` từ GitHub Secrets, rồi mirror lên `/ix.star-siec.edu.vn/backend/` với chế độ `--delete`.
- Deploy backend giữ nguyên `uploads` và không upload `node_modules`.
- Workflow hiện tại không chạy `npm install` hoặc `npm ci` trên server.

### Khi cần cập nhật dependency backend

- Nếu backend thêm package mới hoặc đổi version package, đừng chỉ restart app.
- Hãy cập nhật dependencies trên server bằng cPanel Terminal, SSH, hoặc quy trình cài package tương ứng của Node.js App.
- Sau đó restart lại app và chạy smoke check.

---

## 🛠️ Troubleshooting

### Backend không chạy

```bash
# Kiểm tra port đã dùng
netstat -ano | findstr :5000

# Cài lại dependencies
rm -r node_modules package-lock.json
npm install
```

### AI gợi ý không hoạt động

- Kiểm tra OPENAI_API_KEY ở `.env`
- Kiểm tra key còn quota không
- Xem log backend: `npm start` (terminal)

### Git conflict

```bash
# Nếu xảy ra xung đột
git pull origin main
# Sửa files conflict (mở file, chọn phần cần giữ)
git add .
git commit -m "Resolve conflict"
git push origin main
```

---

## 📚 Tài liệu tham khảo

- [OpenAI API Docs](https://platform.openai.com/docs)
- [GitHub Actions](https://docs.github.com/en/actions)
- [React Documentation](https://react.dev)
- [Node.js Documentation](https://nodejs.org/docs)

---

**Last Updated:** 10/12/2025  
**Version:** 1.0
