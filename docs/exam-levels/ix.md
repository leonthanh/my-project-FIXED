# IX

IX có ba luồng riêng: Reading, Listening và Writing. Trong cấu hình hiện tại chưa có Speaking.

## Reading

Bài Reading được cấu hình theo dạng ba passages. Các dạng câu hỏi hiện có:

- Multiple Choice: chọn A/B/C hoặc A/B/C/D.
- Multi-select: chọn nhiều đáp án.
- Fill: điền đáp án ngắn.
- Matching: nối thông tin.
- True/False/Not Given và Yes/No/Not Given.
- Matching Headings: ghép tiêu đề với đoạn.
- Paragraph Matching: tìm đoạn chứa thông tin.
- Cloze Test: điền từ trong đoạn.
- Sentence Completion: hoàn thành câu.

**Chọn Reading** khi học sinh phải lấy thông tin từ văn bản. Với bài đọc dài, chọn dạng có passage chung và câu hỏi gắn với passage; không dùng dạng điền từ độc lập nếu đề yêu cầu đọc hiểu.

## Listening

Cấu hình gồm bốn phần: hội thoại giao tiếp, độc thoại trong bối cảnh xã hội, thảo luận học thuật và bài giảng. Thời lượng trong cấu hình là 30 phút, có ghi chú thêm 10 phút chuyển đáp án.

Các dạng câu hỏi:

- Fill / điền đáp án.
- Form, Table và Notes Completion.
- Multiple Choice A/B/C hoặc A/B/C/D.
- Matching.
- Multi-select.
- Map/Plan Labeling.
- Flowchart Completion.

**Chọn Listening** khi câu hỏi được trả lời dựa trên audio. Nếu học sinh cần nhìn sơ đồ, bản đồ hoặc bảng trong khi nghe, dùng dạng tương ứng thay vì tạo một loạt câu điền từ thông thường.

## Writing

IX Writing dùng một editor riêng, không phải một loại câu hỏi trắc nghiệm:

- **Task 1:** nhập đề bằng rich text; có thể thêm ảnh minh họa.
- **Task 2:** nhập đề bằng rich text.
- Cả hai task phải có nội dung trước khi tạo đề.
- Bài làm được giáo viên xem xét/chấm, không phải dạng tự chấm như Multiple Choice.

Chọn IX Writing khi giáo viên muốn tạo đề viết gồm hai task. Không dùng trang này cho Speaking.

## Speaking

Chưa có skill, route hoặc bộ câu hỏi Speaking được cấu hình cho IX trong ứng dụng.

## Nguồn cấu hình

- [Danh sách kỹ năng IX](../../frontend/src/domains/ix/config/skills.js)
- [Danh sách dạng câu hỏi và cấu trúc test](../../frontend/src/shared/config/questionTypes.js)
- [IX Writing editor](../../frontend/src/features/writing/pages/WritingTestEditorShell.jsx)
- [IX Writing routes](../../frontend/src/domains/ix/writing/routes.jsx)
