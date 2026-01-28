# Playwright CI — FAQ

**Câu hỏi:** Tại sao phải chạy Playwright trên PR? Nếu lỗi thì phải làm sao?

---

## Tại sao nên chạy Playwright trên PR?
- **Phát hiện regression sớm**: E2E test kiểm tra luồng người dùng quan trọng (ví dụ: Admin list ↔ Detail). Chạy trên PR giúp ngăn lỗi chảy vào `main`/production.
- **Giảm rủi ro deploy**: Tránh tình trạng học sinh bị ảnh hưởng bởi lỗi chức năng khi làm bài.
- **Tự động hoá kiểm tra**: Tiết kiệm thời gian review thủ công, đảm bảo độ ổn định.

---

## Nếu Playwright fail trên PR thì làm sao?
### Checklist xử lý nhanh
1. **Xem log CI** (tab Actions) — download artifact / screenshot / trace nếu có.
2. **Chạy test local** để tái hiện lỗi và debug:
   - cd frontend
   - npm ci
   - npx playwright install --with-deps
   - npm run test:e2e -- <test-file>
   - npx playwright show-report
3. **Phân loại lỗi**:
   - **Test lỗi** (flaky / assertion sai): Sửa test (mock API, tăng timeout, ổn định dữ liệu) và re-run.
   - **App lỗi (regression)**: Fix code trong PR hoặc tạo hotfix, push lại; re-run CI.
   - **Infra/CI timeout**: Re-run job; nếu lặp lại thì điều chỉnh CI (tăng timeout, cài dependency, cache).
4. **Trong trường hợp khẩn** (production bị ảnh hưởng): revert PR hoặc deploy hotfix.
5. **Nếu test flaky**: làm deterministic (mock data), thêm trace/screenshot khi lỗi, hoặc tạm tắt test cho tới khi ổn định.

---

## Lệnh & công cụ hữu ích
- Chạy test local:
  ```bash
  cd frontend
  npm ci
  npx playwright install --with-deps
  npm run test:e2e -- frontend/e2e/admin-band-consistency.spec.js
  ```
- Mở report:
  ```bash
  npx playwright show-report
  ```
- Re-run GitHub job: Actions → Chọn workflow → Re-run jobs

---

## Gợi ý / Best practices
- Làm test ổn định bằng cách **mock API** (tránh phụ thuộc DB trạng thái). 
- Upload **screenshots / traces / HTML report** trong CI để dễ debug. 
- Đặt job Playwright là **required check** nếu bạn muốn chặn merge khi test fail.

---

## Hành động tiếp theo (tùy bạn chọn)
- A) Thêm upload report & traces vào workflow.
- B) Thiết lập job Playwright là required check (cần quyền repo settings).
- C) Cả A & B.

Ghi chú: mình đã chuẩn bị test và workflow; nếu bạn chọn A/B/C mình sẽ tiếp tục cấu hình.
