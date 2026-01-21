# Git Workflow — minimal & practical

Mục tiêu: làm việc trên 2 PC (Công ty + Nhà) **chung 1 branch** `feature/ket` để tránh conflict, giữ lịch sử sạch và đơn giản.

Quick summary
- Trước khi làm: git checkout feature/ket && git pull --rebase origin feature/ket
- Làm việc → commit nhỏ thường xuyên
- Push: git push origin feature/ket
- Nếu push bị reject: git pull --rebase origin feature/ket → fix conflict → git rebase --continue → git push
- Khi hoàn tất feature: tạo PR / merge vào `main` (test trước)

Daily workflow
1) Start work (each machine):

```bash
git checkout feature/ket
git pull --rebase origin feature/ket
```

2) Work & save frequently:

```bash
git add .
git commit -m "feat: ..."
```

3) Push changes:

```bash
git push origin feature/ket
```

Handling push rejection (remote changed):

```bash
# bring remote changes in, replay your commits on top
git pull --rebase origin feature/ket
# resolve conflicts if any
# when done
git rebase --continue
git push origin feature/ket
```

When feature is done
- Open PR or merge into `main` after tests pass.

Useful commands
- status: git status
- recent commits: git log --oneline -n 20
- switch branch: git checkout feature/ket

Best practices
- Keep commits small & descriptive
- Pull (rebase) before you start and before you push
- Merge into main only when feature is complete and tested

If you want, I can shorten or tailor this further and commit the change for you.├─ git add . && git commit -m "PET - 20 questions"
└─ git push origin feature/cam
   ↓
GitHub: feature/cam ← Có 39 + 20 = 59 câu ✅

NGÀY 2 (Công ty):
┌─ git pull --rebase origin feature/cam  (lấy 59 câu)
├─ Sửa styling, thêm collapses
├─ git add . && git commit -m "UI: Add collapse feature"
└─ git push origin feature/cam
   ↓
GitHub: feature/cam ← Có 59 câu + UI ✅

...Lặp lại...

KHOÁ CÔNG VIỆC (Khi xong hết):
┌─ git checkout main
├─ git pull origin main
├─ git merge feature/cam
└─ git push origin main
   ↓
GitHub: main ← Có tất cả features ✅
```

---

## 🛠️ **COMMANDS THƯỜNG DÙNG**

### **Kiểm tra**

```bash
git branch           # Xem branch hiện tại
git status          # Xem file thay đổi
git log --oneline   # Xem history commits
```

### **Làm việc hàng ngày**

```bash
# Cập nhật code (LUÔN LUÔN LÀM ĐẦU TIÊN)
git pull --rebase origin feature/cam

# Làm việc... (tạo/sửa file)

# Commit & Push
git add .
git commit -m "Mô tả thay đổi"
git push origin feature/cam
```

### **Nếu push bị reject**

```bash
# Đừng panic! Chỉ cần:
git pull --rebase origin feature/cam
git push origin feature/cam
```

---

## ⚠️ **TRÁNH NHẦM LẦN**

### **❌ KHÔNG NÊN**

```bash
# Commit trực tiếp vào main
git checkout main && git add . && git commit -m "..."  ← SAI!

# Merge từng feature vào main liên tục
git checkout main && git merge feature/cam  ← SAI! (chưa hết việc)

# Push mà không pull trước
git push origin feature/cam  ← SAI! (có thể bị conflict)
```

### **✅ NÊN LÀM**

```bash
# Luôn trên feature/cam (hoặc feature branch)
git checkout feature/cam

# Luôn pull trước push
git pull --rebase origin feature/cam
git push origin feature/cam

# Chỉ merge vào main khi THỰC SỰ xong
```

---

## 📞 **NẾUCÓ CONFLICT**

### **Nếu bị conflict khi pull:**

```bash
# Git sẽ báo: "CONFLICT in file/path"

# Mở file, tìm:
# <<<<<<< HEAD
# ... code của bạn ...
# =======
# ... code từ remote ...
# >>>>>>>

# Chọn code đúng, xoá markers

# Fix xong:
git add .
git rebase --continue
git push origin feature/cam
```

### **Nếu pull bị fail - reset lại:**

```bash
# Quay lại trạng thái sạch
git rebase --abort
git pull --rebase origin feature/cam
```

---

## 📊 **SO SÁNH: Cách làm cũ vs Cách làm mới**

| Yếu tố         | Cách cũ (Bị conflict)                                | Cách mới (Không conflict) |
| -------------- | ---------------------------------------------------- | ------------------------- |
| Branches       | Nhiều (feature/reading, feature/pet, feature/cam...) | 1 cái (feature/cam)       |
| Merge vào main | Mỗi khi xong 1 feature                               | Chỉ khi hết việc          |
| Pull strategy  | Không pull/Lỗi pull                                  | `git pull --rebase`       |
| Conflict       | Thường xuyên                                         | Hiếm                      |
| Phức tạp       | Cao                                                  | Thấp                      |

---

## 🎯 **TL;DR - Tóm tắt siêu ngắn**

```bash
# Setup (lần đầu)
git checkout -b feature/cam && git push -u origin feature/cam

# Hàng ngày (mỗi lúc làm việc)
git pull --rebase origin feature/cam

# Xong công việc
git add . && git commit -m "..." && git push origin feature/cam

# Xong hết (merge vào main)
git checkout main && git pull && git merge feature/cam && git push
```

---

**Good luck! Không còn conflict nữa! 🚀**

_Cập nhật: 07/01/2026 - Phiên bản dành cho người làm 2 PC_

---

### **Kiểm tra**

```bash
git branch           # Xem branch hiện tại
git status          # Xem file thay đổi
git log --oneline   # Xem history commits
```

### **Làm việc hàng ngày**

```bash
# Cập nhật code (LUÔN LUÔN LÀM ĐẦU TIÊN)
git pull --rebase origin feature/cam

# Làm việc... (tạo/sửa file)

# Commit & Push
git add .
git commit -m "Mô tả thay đổi"
git push origin feature/cam
```

### **Nếu push bị rejected**

```bash
# Đừng panic! Chỉ cần:
git pull --rebase origin feature/cam
git push origin feature/cam
```

---

## ⚠️ **TRÁNH NHẦM LẦN**

### **❌ KHÔNG NÊN**

```bash
# Commit trực tiếp vào main
git checkout main && git add . && git commit -m "..."  ← SAI!

# Merge từng feature vào main liên tục
git checkout main && git merge feature/cam  ← SAI! (chưa hết việc)

# Push mà không pull trước
git push origin feature/cam  ← SAI! (có thể bị conflict)
```

### **✅ NÊN LÀM**

```bash
# Luôn trên feature/cam (hoặc feature branch)
git checkout feature/cam

# Luôn pull trước push
git pull --rebase origin feature/cam
git push origin feature/cam

# Chỉ merge vào main khi THỰC SỰ xong
```

---

## 📞 **NẾU CÓ CONFLICT**

### **Nếu bị conflict khi pull:**

```bash
# Git sẽ báo: "CONFLICT in file/path"

# Mở file, tìm:
# <<<<<<< HEAD
# ... code của bạn ...
# =======
# ... code từ remote ...
# >>>>>>>

# Chọn code đúng, xoá markers

# Fix xong:
git add .
git rebase --continue
git push origin feature/cam
```

### **Nếu pull bị fail - reset lại:**

```bash
# Quay lại trạng thái sạch
git rebase --abort
git pull --rebase origin feature/cam
```

---

## 📊 **SO SÁNH: Cách làm cũ vs Cách làm mới**

| Yếu tố         | Cách cũ (Bị conflict)                                | Cách mới (Không conflict) |
| -------------- | ---------------------------------------------------- | ------------------------- |
| Branches       | Nhiều (feature/reading, feature/pet, feature/cam...) | 1 cái (feature/cam)       |
| Merge vào main | Mỗi khi xong 1 feature                               | Chỉ khi hết việc          |
| Pull strategy  | Không pull/Lỗi pull                                  | `git pull --rebase`       |
| Conflict       | Thường xuyên                                         | Hiếm                      |
| Phức tạp       | Cao                                                  | Thấp                      |

---

## 🎯 **TL;DR - Tóm tắt siêu ngắn**

```bash
# Setup (lần đầu)
git checkout -b feature/cam && git push -u origin feature/cam

# Hàng ngày (mỗi lúc làm việc)
git pull --rebase origin feature/cam

# Xong công việc
git add . && git commit -m "..." && git push origin feature/cam

# Xong hết (merge vào main)
git checkout main && git pull && git merge feature/cam && git push
```

---

**Good luck! Không còn conflict nữa! 🚀**

_Cập nhật: 07/01/2026 - Phiên bản dành cho người làm 2 PC_

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

_Cập nhật lần cuối: 12/12/2025_
