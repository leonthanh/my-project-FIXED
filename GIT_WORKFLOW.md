# 📚 Git Workflow - Hướng dẫn làm việc với Branches

**Dành cho dự án IELTS/PET Test Platform**

---

## 📋 **Mục lục**
1. [Khái niệm cơ bản](#khái-niệm-cơ-bản)
2. [Quy trình làm việc 2 PC](#quy-trình-làm-việc-2-pc)
3. [Commands thường dùng](#commands-thường-dùng)
4. [Merge & Rebase](#merge--rebase)
5. [Troubleshooting](#troubleshooting)

---

## 🎯 **Khái niệm cơ bản**

### **Main Branch**
- Branch chính, luôn **ổn định, hoạt động tốt**
- Dùng để deploy production
- **KHÔNG bao giờ commit trực tiếp vào main**

### **Feature Branches**
- Dùng để phát triển tính năng riêng biệt
- Tên: `feature/tên-tính-năng`
- Ví dụ:
  - `feature/reading-test` (Reading IELTS)
  - `feature/pet-test` (PET Cambridge)

### **Merge vs Rebase**

| Tính chất | Merge | Rebase |
|-----------|-------|--------|
| Cách hoạt động | Tạo commit "merge" kết nối 2 branch | "Dựng lại" commit trên base mới |
| Lịch sử commits | Phức tạp, nhiều nhánh | Sạch, tuyến tính |
| Khi dùng | Merge công khai, production | Rebase local trước push |
| Command | `git merge branch-name` | `git rebase main` |

---

## 🏢 **Quy trình làm việc 2 PC**

### **Tại PC Công ty (Làm Reading/Listening IELTS)**

#### 1️⃣ **Lần đầu tiên - Setup branch**
```bash
# Đảm bảo main mới nhất
git checkout main
git pull origin main

# Tạo branch cho Reading/Listening
git checkout -b feature/reading-test

# Bây giờ bạn đang trên branch: feature/reading-test ✅
```

#### 2️⃣ **Làm việc hàng ngày**
```bash
# Kiểm tra đang ở branch nào
git branch

# Output: 
# * feature/reading-test   ← Đang ở đây
#   main

# Làm việc... tạo/sửa file

# Commit thường xuyên (mỗi 30 phút - 1 tiếng)
git add .
git commit -m "Add: Delete button for Reading questions"

# Hoặc nếu chưa xong feature (WIP = Work In Progress)
git commit -m "WIP: Reading test - still working on styling"
```

#### 3️⃣ **Khi sắp về nhà hoặc xong ngày**
```bash
# Push branch lên GitHub (backup + share code)
git push origin feature/reading-test

# Hoặc viết tắt (lần đầu)
git push -u origin feature/reading-test
```

#### 4️⃣ **Khi hoàn toàn xong feature (merge vào main)**
```bash
# Đảm bảo main mới nhất
git checkout main
git pull origin main

# Merge feature vào main
git merge feature/reading-test

# Push main lên GitHub
git push origin main

# (Tuỳ chọn) Xoá branch local
git branch -d feature/reading-test
```

---

### **Tại PC Nhà (Làm PET Cambridge)**

#### 1️⃣ **Khi về nhà - Setup**
```bash
# Cập nhật code mới từ công ty
git checkout main
git pull origin main

# Kiểm tra có gì mới không
git log --oneline -5

# Tạo branch cho PET test
git checkout -b feature/pet-test

# Bây giờ bạn đang trên branch: feature/pet-test ✅
```

#### 2️⃣ **Làm việc hàng ngày (giống PC công ty)**
```bash
# Làm việc...
git add .
git commit -m "WIP: PET test - adding question types"

# Không cần push ngay (chỉ local)
# Hoặc push để backup
git push origin feature/pet-test
```

#### 3️⃣ **Lưu ý quan trọng**
```bash
# ✅ Luôn tách biệt: feature/reading-test ≠ feature/pet-test
# ✅ Không chạm vào code Reading khi đang làm PET
# ✅ Commit local an toàn, không ảnh hưởng main
# ✅ Khi lấy code mới từ công ty: git pull origin main
```

---

## 🛠️ **Commands thường dùng**

### **Kiểm tra trạng thái**
```bash
# Xem branch hiện tại
git branch

# Xem tất cả branches (local + remote)
git branch -a

# Xem status
git status

# Xem 5 commit gần nhất
git log --oneline -5

# Xem chi tiết 1 commit
git log -p -1
```

### **Tạo & Chuyển branch**
```bash
# Tạo branch mới
git checkout -b feature/tên-tính-năng

# Chuyển sang branch khác
git checkout main
git checkout feature/reading-test

# (Mới hơn) Dùng switch
git switch main
git switch -c feature/pet-test  # Tạo + chuyển
```

### **Commit & Push**
```bash
# Thêm tất cả file
git add .

# Commit với message
git commit -m "Add: Reading test delete button"

# Push lên GitHub
git push origin feature/reading-test

# Push tất cả commits
git push

# (Lần đầu)
git push -u origin feature/reading-test
```

### **Update code từ main**
```bash
# Cách 1: Merge (khuyến khích)
git checkout feature/reading-test
git merge main

# Cách 2: Rebase (nâng cao)
git checkout feature/reading-test
git rebase main
```

### **Xoá branch**
```bash
# Xoá local
git branch -d feature/reading-test

# Xoá remote (GitHub)
git push origin --delete feature/reading-test

# Xoá cả 2
git branch -D feature/reading-test  # local
git push origin --delete feature/reading-test  # remote
```

---

## 🔀 **Merge & Rebase**

### **Merge (Khuyến khích cho bạn)**
```bash
# Merge feature vào main
git checkout main
git merge feature/reading-test

# Kết quả: Lịch sử có nhánh, nhưng dễ hiểu
# main ─────────────●  (merge commit)
#        \         /
#         feature-●─●
```

### **Rebase (Nâng cao)**
```bash
# Rebase feature lên main
git checkout feature/reading-test
git rebase main

# Kết quả: Lịch sử tuyến tính, sạch
# main ──●──●──●
#              \
#             feature (commits được "xây dựng lại")
```

**Lời khuyên:**
- ✅ **Merge** khi merge vào main (an toàn)
- ✅ **Rebase** khi update code từ main (history sạch)

---

## ⚠️ **Troubleshooting**

### **1. Quên branch, commit vào main**
```bash
# Hoàn tác commit cuối cùng
git reset --soft HEAD~1

# Tạo branch mới
git checkout -b feature/missed-feature

# Commit lại vào branch đúng
git add .
git commit -m "..."
git push origin feature/missed-feature
```

### **2. Commit trên branch sai**
```bash
# Xem branch hiện tại
git branch

# Tạo branch mới
git checkout -b feature/correct-name

# Push
git push origin feature/correct-name

# Xoá branch sai
git branch -d feature/wrong-name
```

### **3. Merge conflict (xung đột)**
```bash
# Khi merge xảy ra conflict
git merge feature/reading-test

# VS Code sẽ highlight conflict, bạn chỉnh sửa file

# Sau khi fix:
git add .
git commit -m "Resolve merge conflict"
git push origin main
```

### **4. Muốn quay lại commit cũ**
```bash
# Xem lịch sử
git log --oneline

# Quay lại commit cũ (tạo branch mới)
git checkout -b feature/from-old-commit abc1234

# Hoặc reset (xoá commits)
git reset --hard abc1234  # ⚠️ Cẩn thận, không thể hoàn tác!
```

### **5. Push bị reject (server có code mới)**
```bash
# Pull code mới từ server trước
git pull origin feature/reading-test

# Rồi push lại
git push origin feature/reading-test
```

---

## 📊 **Sơ đồ quy trình cụ thể cho bạn**

```
TUẦN ĐẦU TIÊN:

PC Công ty (Thứ 2-4-6):
├─ git checkout -b feature/reading-test
├─ Làm Reading/Listening
├─ git add . && git commit -m "..."
├─ git push origin feature/reading-test
└─ main vẫn sạch ✅

PC Nhà (Thứ 3-5-7):
├─ git checkout main
├─ git pull origin main (lấy code mới)
├─ git checkout -b feature/pet-test
├─ Làm PET Cambridge
├─ git add . && git commit -m "..."
├─ git push origin feature/pet-test
└─ main vẫn sạch ✅

TUẦN THỨ 2+:

PC Công ty (Xong Reading):
├─ git checkout main
├─ git pull origin main
├─ git merge feature/reading-test
├─ git push origin main
└─ main bây giờ có Reading ✅

PC Nhà (Xong PET):
├─ git checkout main
├─ git pull origin main (lấy Reading từ công ty)
├─ git merge feature/pet-test
├─ git push origin main
└─ main bây giờ có PET ✅
```

---

## 💡 **Cheat Sheet nhanh**

```bash
# Lần đầu (PC công ty)
git checkout -b feature/reading-test
# Làm việc...
git add . && git commit -m "..."
git push -u origin feature/reading-test

# Hàng ngày
git add . && git commit -m "..."
git push origin feature/reading-test

# Lần đầu (PC nhà)
git checkout main && git pull origin main
git checkout -b feature/pet-test
# Làm việc...
git add . && git commit -m "..."
git push -u origin feature/pet-test

# Xong feature (merge về main)
git checkout main
git pull origin main
git merge feature/reading-test
git push origin main
```

---

## 📞 **Khi cần giúp đỡ**

Nếu lúng túng, hãy kiểm tra:
1. **Branch hiện tại:** `git branch`
2. **Status:** `git status`
3. **Commits:** `git log --oneline -5`
4. **Xem file thay đổi:** `git diff`

Hoặc reset về trạng thái sạch:
```bash
git reset --hard origin/main
git checkout main
git pull origin main
```

---

**Good luck! Chúc bạn code vui! 🚀**

*Cập nhật lần cuối: 12/12/2025*
