# Placement Test Phase 1 Spec

## 1. Muc tieu

Xay dung mot luong `Placement Test` rieng cho hoc sinh thi dau vao ma khong can tao tai khoan.

Muc tieu nghiep vu:

- Hoc sinh chi can nhap `ho ten` va `so dien thoai` de vao bai.
- Giao vien hoac admin chi dinh san goi de placement gom `1` hoac `3` bai.
- Giao vien xem duoc chi tiet bai lam de tu van va xep lop.
- Hoc sinh chi xem `tong quan ket qua`, khong xem chi tiet dap an va review tung cau.
- Tuan thu huong hien tai cua he thong: IX va Orange/Cambridge co the cung tham gia trong mot goi placement.

## 2. Pham vi Phase 1

Phase 1 chi nen gom cac bai `auto-scored`:

- IX Reading
- IX Listening
- Cambridge Reading
- Cambridge Listening

Khong dua vao Phase 1:

- Writing placement
- Dang ky tai khoan hoc sinh tu dong
- OTP, reset mat khau, hoac login cho hoc sinh placement
- Adaptive branching phuc tap sau tung bai

Ly do: phan auto-scored da co submission va result flow san, co the tan dung de ra mat nhanh va it rui ro.

## 3. Nguyen tac thiet ke

- Placement la `public flow`, tach khoi luong `/login` va dang ky tai khoan.
- Teacher/Admin moi la ben chon de, xem chi tiet, va xem toan bo lich su.
- Hoc sinh placement la `guest candidate`, khong can `userId`.
- Ket qua hoc sinh chi hien summary: tong diem, nhom ky nang, muc de xuat, ghi chu tong quan.
- Review chi tiet tiep tuc dung cac trang review hien co cua IX/Cambridge de tranh viet lai logic cham bai.

## 4. Luong man hinh

### 4.1 Public entry

Them nut `Placement Test` tai trang login.

Route de xuat:

- `/placement-test`
- `/placement-test/:accessCode`

Hanh vi:

- Hoc sinh vao bang link hoac ma do giao vien cung cap.
- Nhap `ho ten` va `so dien thoai`.
- He thong hien ten goi test, so bai trong goi, tong thoi gian du kien.
- Neu ma khong hop le, goi da tat, hoac da het han thi hien trang loi don gian.

### 4.2 Start screen

Man hinh truoc khi vao bai:

- Ten goi placement
- Danh sach bai duoc giao theo thu tu
- Moi bai thuoc platform nao: `IX` hoac `Orange`
- Tong thoi gian uoc tinh
- Nut `Bat dau placement`

### 4.3 Runtime

Moi bai trong placement se mo bang runtime hien co cua bai do, nhung chay trong `placement context`.

Placement context can co:

- `attemptId`
- `attemptToken`
- `packageId`
- `itemIndex`
- `isPlacement = true`

Sau khi nop bai:

- Neu con bai tiep theo, chuyen sang bai tiep.
- Neu da het, chuyen sang trang tong ket placement.

### 4.4 Student summary

Route de xuat:

- `/placement-test/result/:attemptToken`

Hoc sinh chi thay:

- Ho ten
- So dien thoai da dang ky
- Trang thai hoan thanh
- Tong diem / tong bai
- Skill summary theo bai
- Muc de xuat: vi du `Starters`, `Movers`, `Flyers`, `KET`, `PET`
- Loi nhan: giao vien se lien he tu van va xep lop

Hoc sinh khong thay:

- Dap an dung/sai tung cau
- Detailed review
- Teacher-only tabs
- Link vao admin review

### 4.5 Teacher/admin pages

Route de xuat:

- `/admin/placement-packages`
- `/admin/placement-packages/new`
- `/admin/placement-packages/:id/edit`
- `/admin/placement-attempts`
- `/admin/placement-attempts/:id`

Teacher/Admin co the:

- Tao goi placement
- Chon 1 hoac 3 bai theo thu tu
- Bat/tat goi
- Sao chep public link hoac ma ngan
- Xem danh sach hoc sinh da lam
- Mo chi tiet tung bai qua cac trang review hien co
- Danh dau da tu van / da xep lop / bo qua

## 5. Cau truc du lieu de xuat

### 5.1 Bang `placement_packages`

Dung de dinh nghia mot goi placement do teacher/admin tao.

Cac cot de xuat:

- `id`
- `title`
- `description`
- `accessCode`
- `status` enum: `draft | active | archived`
- `createdByUserId`
- `assignedTeacherId`
- `maxAttemptsPerPhone` default `1`
- `expiresAt` nullable
- `resultMode` default `summary-only`
- `recommendedLevelRules` JSON
- `items` JSON hoac tach bang con
- `createdAt`
- `updatedAt`

Ghi chu:

- Neu muon it migration nhat, co the luu `items` bang JSON trong phase 1.
- Neu muon bao cao va filter tot hon, nen co bang con `placement_package_items`.

### 5.2 Bang `placement_package_items`

Khuyen nghi tao bang rieng de quan ly thu tu bai.

Cac cot de xuat:

- `id`
- `packageId`
- `orderIndex`
- `platform` enum: `ix | orange`
- `skill` enum: `reading | listening`
- `testType` nullable, vi du `ket-reading`, `pet-listening`
- `testId`
- `durationOverrideMinutes` nullable
- `isRequired` default `true`

### 5.3 Bang `placement_attempts`

Day la ho so lam bai cua mot hoc sinh guest.

Cac cot de xuat:

- `id`
- `packageId`
- `attemptToken`
- `studentName`
- `studentPhone`
- `status` enum: `created | in_progress | submitted | reviewed | advised | archived`
- `currentItemIndex`
- `startedAt`
- `submittedAt`
- `recommendedLevel`
- `summaryScore`
- `summaryPayload` JSON
- `teacherNote` TEXT
- `assignedTeacherId`
- `createdAt`
- `updatedAt`

### 5.4 Bang `placement_attempt_items`

Bang nay la diem noi giua placement flow va cac bang submission san co.

Cac cot de xuat:

- `id`
- `attemptId`
- `packageItemId`
- `orderIndex`
- `platform`
- `skill`
- `testType` nullable
- `testId`
- `status` enum: `pending | in_progress | submitted | skipped`
- `submissionKind` enum: `reading | listening | cambridge`
- `submissionId` nullable
- `score`
- `total`
- `percentage`
- `startedAt`
- `submittedAt`
- `resultSummary` JSON

Uu diem cua bang nay:

- Khong can sua sau vao `reading_submissions`, `listening_submissions`, `cambridge_submissions` trong phase 1.
- Teacher dashboard co the tong hop tu bang nay roi link sang submission chi tiet hien co.

## 6. API de xuat

### 6.1 Public APIs

- `GET /api/placement-packages/public/:accessCode`
  - Tra thong tin goi active co the thi.
- `POST /api/placement-attempts`
  - Tao mot attempt moi tu `accessCode`, `studentName`, `studentPhone`.
- `GET /api/placement-attempts/public/:attemptToken`
  - Lay trang thai va bai hien tai cua attempt.
- `POST /api/placement-attempts/:attemptToken/start-item`
  - Danh dau bat dau bai thu `n`.
- `POST /api/placement-attempts/:attemptToken/complete-item`
  - Ghi nhan item da nop va ket qua tong hop.
- `GET /api/placement-attempts/public/:attemptToken/result`
  - Tra ve summary cho hoc sinh.

### 6.2 Teacher/Admin APIs

- `GET /api/admin/placement-packages`
- `POST /api/admin/placement-packages`
- `PATCH /api/admin/placement-packages/:id`
- `GET /api/admin/placement-attempts`
- `GET /api/admin/placement-attempts/:id`
- `PATCH /api/admin/placement-attempts/:id`

## 7. Rule phan quyen

### 7.1 Hoc sinh / public user

Duoc phep:

- Mo link placement public
- Tao attempt bang ho ten va so dien thoai
- Lam cac bai duoc gan san
- Xem trang summary cuoi cung

Khong duoc phep:

- Xem detailed review
- Xem feedback noi bo cua giao vien
- Xem bai lam cua nguoi khac
- Vao admin routes

### 7.2 Teacher

Duoc phep:

- Tao va sua placement package
- Xem danh sach attempts do minh phu trach hoac duoc phan cong
- Xem chi tiet tung bai placement
- Mo cac trang review hien co cua submission
- Ghi chu tu van, cap nhat muc xep lop

Khong duoc phep:

- Xem attempts ngoai pham vi duoc phan cong neu sau nay can phan quyen chi tiet hon

### 7.3 Admin

Duoc phep:

- Toan quyen tren placement packages va attempts
- Xem bao cao toan he thong
- Gan teacher phu trach cho package hoac attempt

## 8. Cach tan dung cac man hien co

Phase 1 khong nen viet lai trang ket qua chi tiet.

Tan dung:

- IX Reading result overview + teacher review split
- IX Listening result overview + teacher review split
- Cambridge result page voi teacher-only detailed review
- Admin submission pages hien co de mo submission goc khi can

Nguyen tac trien khai:

- Placement summary cua hoc sinh la man moi.
- Teacher detail page chi la mot dashboard tong hop, trong do moi item co nut `Mo review` sang man da ton tai.

## 9. Quy tac scoring va xep lop

Phase 1 nen de scoring rule o muc don gian, co the cau hinh theo package.

De xuat:

- Moi item co trong so mac dinh bang nhau.
- He thong tinh `average percentage` cua toan goi.
- Teacher/Admin duoc gan bang rule JSON tren package.

Vi du rule:

- `0-34`: Starters
- `35-54`: Movers
- `55-69`: Flyers
- `70-84`: KET
- `85-100`: PET

Ghi chu:

- Rule nay la `goi y`, teacher co the override bang tay khi tu van.
- Khong nen hardcode chung cho moi package, vi co giao vien chi dung 1 bai KET/PET screening.

## 10. Guardrails va van hanh

- Mot so dien thoai chi duoc tao `1 active attempt` trong cung package tai mot thoi diem.
- Co the gioi han `1-2 lan` placement moi package moi ngay.
- Attempt token phai kho doan va khong doan duoc.
- Public result page chi dung token, khong expose ID tang dan.
- Package co the dat `expiresAt` de ngung su dung sau chien dich dau vao.
- Teacher co the archive attempt sau khi da tu van xong.

## 11. Ke hoach implementation de xuat

### B1. Public entry

- Them nut `Placement Test` o trang login.
- Tao trang public nhap `ho ten` + `so dien thoai` + validate access code/link.

### B2. Data + APIs

- Tao cac bang placement.
- Tao public APIs va teacher/admin APIs.
- Luu lien ket den cac submission hien co qua `placement_attempt_items`.

### B3. Runtime integration

- Cho IX Reading/Listening chay trong placement context.
- Cho Cambridge Reading/Listening chay trong placement context.
- Sau moi bai, cap nhat progress cho attempt.

### B4. Result + dashboard

- Tao student summary page.
- Tao teacher package list, attempt list, attempt detail.
- Them nut `Mo review` de nhay vao trang review chi tiet hien co.

## 12. De xuat chot cho Phase 1

Huong nen chot:

- Them nut `Placement Test` tren login.
- Dung `public package link` do teacher/admin tao.
- Hoc sinh chi nhap `ho ten` + `so dien thoai`.
- Chi ho tro `Reading` va `Listening` cua IX va Orange trong dot dau.
- Dung `placement_attempt_items` de map sang submission hien co.
- Hoc sinh chi thay summary, teacher/admin moi thay detail.

Neu dong y spec nay, buoc tiep theo nen la scaffold Phase 1 theo thu tu:

1. nut `Placement Test` + public entry route
2. bang du lieu + API placement package/attempt
3. teacher pages cho package va attempt list
