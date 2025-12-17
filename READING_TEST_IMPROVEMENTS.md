# 📚 Reading Test Creation UI - Cải Tiến Thiết Kế

## Ngày Cập Nhật: 16/12/2025

### 🎯 Cải Tiến Chính

#### 1. **Header Nhỏ Gọn & Canh Giữa** ✨
- **Trước**: Header to, chiếm nhiều không gian
- **Sau**: Header nhỏ gọn, các ô input canh giữa và responsive
- **Lợi ích**: 
  - Tiết kiệm không gian cho 4 cột main
  - Giao diện sạch sẽ, chuyên nghiệp
  - Dễ nhập thông tin cơ bản

```
Tiêu đề đề thi | Mã lớp | Tên giáo viên
(tự động canh giữa, responsive trên mobile)
```

---

#### 2. **4-Column Responsive Dashboard** 📊
- **Cột 1 (12%)**: 📚 **PASSAGES** - Danh sách passages
- **Cột 2 (38%)**: 📄 **CONTENT** - Editor passage (tiêu đề + nội dung Quill)
- **Cột 3 (12%)**: 📌 **SECTIONS** - Danh sách sections
- **Cột 4 (38%)**: ❓ **QUESTIONS** - Editor câu hỏi

**Tỷ lệ**:
- Cột Passages & Sections: **12% mỗi cái** (nhỏ, dùng để chọn)
- Cột Content & Questions: **38% mỗi cái** (lớn, dùng để soạn)

---

#### 3. **Resize Dividers** 🔄
- **Chức năng**: Kéo giữa các cột để điều chỉnh kích thước
- **Cách dùng**: 
  1. Hover vào đường giữa 2 cột → cursor thay đổi thành `col-resize`
  2. Click và kéo sang trái/phải
  3. Thả chuột để cố định vị trí
- **Ràng buộc**: 
  - Cột Passages/Sections: Min 8%, Max 20%
  - Cột Content/Questions: Min 20%, Max 50%
- **Lợi ích**: Giáo viên có thể tùy chỉnh bố cục theo sở thích

**Ví dụ Resize**:
```
BEFORE: 12% | 38% | 12% | 38%
         (drag divider)
AFTER:  8%  | 42% | 12% | 38%
```

---

#### 4. **Collapse/Expand Columns** 🎚️
- **Chức năng**: Click vào tiêu đề cột để thu/mở cột
- **Trạng thái**:
  - **Mở (full width)**: Hiển thị tiêu đề text + nội dung
  - **Thu (50px)**: Chỉ hiển thị icon, sửa tiết kiệm không gian
- **Sử dụng**: Khi cần focus vào 1-2 cột, thu các cột khác
- **Smooth Animation**: Chuyển đổi mềm mại 0.3s

**Ví dụ**:
```
Click vào "📚 PASSAGES" → Thu lại thành icon "📚" (50px width)
Click lại → Mở rộng trở lại 12%
```

---

#### 5. **Quick Stats Bar** 📈
- **Hiển thị**: Ở dưới cùng, ngay trên nút Preview/Create
- **Thông tin**:
  - 📚 Passages: `N` (số passages)
  - 📌 Sections: `N` (tổng sections tất cả passages)
  - ❓ Questions: `N` (tổng questions tất cả)
- **Tác dụng**: Giáo viên có thể kiểm tra nhanh tiến độ

**Ví dụ**:
```
📚 Passages: 3 | 📌 Sections: 9 | ❓ Questions: 42
```

---

#### 6. **Copy Section Feature** 📋
- **Nơi**: Nút "📋 Sao chép" ở header của mỗi Section
- **Chức năng**: 
  1. Deep copy toàn bộ section (tiêu đề, hướng dẫn, ảnh, câu hỏi)
  2. Insert ngay sau section gốc
  3. Tự động select section mới vừa copy
- **Lợi ích**: 
  - Tạo section tương tự nhanh chóng
  - Tiết kiệm thời gian nhập lại
  - Perfect cho matching/fill-blank sections

**Ví dụ Workflow**:
```
1. Soạn Section 1 (Matching) với 3 câu hỏi
2. Click "📋 Sao chép"
3. System tạo Section 2 (copy hệt Section 1)
4. Giáo viên chỉ cần sửa lại tiêu đề & câu hỏi
```

---

#### 7. **Copy Question Feature** 📋
- **Nơi**: Nút "📋" ở mỗi question
- **Chức năng**: Deep copy question, insert ngay sau question gốc
- **Lợi ích**: Tạo mẫu question tương tự nhanh
- **Kombo**: Copy section + Copy question = tạo đề siêu nhanh

---

### 💡 Workflows Tối Ưu

#### **Workflow 1: Tạo đề từ template**
```
1. Tạo Passage 1 (3 sections)
2. Click "📋 Sao chép" mỗi section 2-3 lần
3. Copy từng question trong sections
4. Giáo viên chỉ cần chỉnh sửa nội dung chi tiết
✅ Tiết kiệm ~70% thời gian nhập liệu
```

#### **Workflow 2: Focus edit từng phần**
```
1. Collapse "PASSAGES" cột (50px) → tiết kiệm space
2. Expand "CONTENT" cột (50%) → full focus soạn passage
3. Collapse "CONTENT", expand "QUESTIONS" → edit câu hỏi
✅ Giảm split-screen fatigue, dễ focus hơn
```

#### **Workflow 3: Resize cho laptop vs tablet**
```
Laptop 1920px: 12% | 38% | 12% | 38% (đủ space)
Tablet 1024px:  8% | 42% | 12% | 38% (adjust via drag)
✅ Adaptive layout cho mọi màn hình
```

---

### 🎨 Visual Improvements

| Yếu Tố | Trước | Sau |
|--------|-------|-----|
| **Header** | 20px padding, full width inputs | 12px padding, centered 800px max |
| **4-Column** | Equal 25% + 1px gap | Smart 12/38/12/38% + resize |
| **Collapse** | Manual toggle only | Toggle + smooth animation |
| **Dividers** | None | Interactive resize dividers |
| **Stats** | None | Live counter: 3 | 9 | 42 |
| **Copy Section** | None | 📋 button in header |
| **Buttons** | Basic | Hover effects + stats display |

---

### ⚙️ Technical Details

#### **State Management**
```javascript
// Column width tracking
const [columnWidths, setColumnWidths] = useState({
  col1: 12,  // Passages
  col2: 38,  // Content
  col3: 12,  // Sections
  col4: 38   // Questions
});

// Resize state
const [isResizing, setIsResizing] = useState(null); // divider index
```

#### **Resize Logic**
- **Divider Index 1**: Between Passages & Content
- **Divider Index 2**: Between Content & Sections
- **Divider Index 3**: Between Sections & Questions
- **Constraints**: Min/max percentage per column
- **Event**: mousemove/mouseup global handlers

#### **Copy Functions**
```javascript
// Copy question - insert after original
const handleCopyQuestion = (passageIndex, sectionIndex, questionIndex) => {
  const copiedQuestion = JSON.parse(JSON.stringify(originalQuestion));
  section.questions.splice(questionIndex + 1, 0, copiedQuestion);
};

// Copy section - insert after original
const handleCopySection = (passageIndex, sectionIndex) => {
  const copiedSection = JSON.parse(JSON.stringify(originalSection));
  passage.sections.splice(sectionIndex + 1, 0, copiedSection);
  setSelectedSectionIndex(sectionIndex + 1); // auto-select
};
```

---

### 🚀 Sử Dụng

1. **Navigate**: Click passage → content hiển thị
2. **Edit**: Chỉnh sửa title & passage text ở cột Content
3. **Add Section**: Click "➕ Thêm Section" trong cột Sections
4. **Copy Section**: Nếu muốn section tương tự, click "📋 Sao chép"
5. **Edit Questions**: Click section → questions hiển thị ở cột Questions
6. **Copy Question**: Click "📋" bên question để duplicate
7. **Resize**: Drag dividers giữa cột để adjust kích thước
8. **Collapse**: Click tiêu đề cột để collapse/expand
9. **Preview**: Click "👁 Preview" để xem tổng quan
10. **Submit**: Click "✏️ Xem lại & Tạo" để lưu

---

### 📱 Responsive Behavior

- **Desktop (1920px)**: Full layout, tất cả cột rõ ràng
- **Laptop (1280px)**: Slightly compressed, resize dividers helpful
- **Tablet (1024px)**: Adjust via resize, collapse optional
- **Collapse Key**: Thu cột → single focus view
  - Passages + Content + Questions visible
  - Sections hidden → zoom in content

---

### ✅ Next Steps / Future Enhancements

- [ ] Drag-drop sections/questions để reorder
- [ ] Keyboard shortcuts: Copy (Ctrl+D), Paste (Ctrl+V)
- [ ] Undo/Redo (Ctrl+Z, Ctrl+Y)
- [ ] Template library (Basic IELTS, Advanced, etc.)
- [ ] Bulk import questions từ CSV
- [ ] Real-time collaboration (multiplayer editing)

---

### 📝 Notes

- **Auto-save**: Every 30 seconds (localStorage)
- **No data loss**: LocalStorage backup
- **Mobile support**: Collapse-first design
- **Accessibility**: Semantic HTML, keyboard navigable

---

**Tác giả**: Development Team  
**Status**: ✅ Deployed  
**Tested**: CreateReadingTest, EditReadingTest (pending)  
