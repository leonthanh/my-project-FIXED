# Prepare

Prepare hiện chia thành **Reading & Writing** và **Listening**. Reading và Writing không phải hai tab riêng; chúng nằm trong skill Reading & Writing. Chưa có skill Speaking.

## Reading & Writing

Builder linh hoạt cho phép giáo viên thêm Part/Section, đổi tên, chọn dạng câu hỏi và cấu hình điểm mỗi đáp án. Các dạng dùng chung được lấy từ nhóm KET, PET và Gateway, như:

- Signs & Messages, People Matching, Long Text Multiple Choice.
- Multiple Choice Cloze, Open Cloze, Inline Choice và Word Form.
- Fill, A/B/C, Matching và Gap Match.
- Sentence Transformation, Sentence Correction, True/False/Not Given.
- Reading Open Questions.
- Short Message và Story Writing.

### Các dạng PP theo bài mẫu Prepare

| Bài | Dạng cần chọn | Dùng khi đề yêu cầu |
|---|---|---|
| Vocabulary 1 | Two Word Banks - Sentence Completion | Mỗi câu lấy một từ từ bank A và một từ từ bank B |
| Vocabulary 2 | Definition Completion with First Letter | Đọc định nghĩa và điền từ có chữ cái đầu được gợi ý |
| Vocabulary 3 | Word Bank - Adjective Formation | Dùng bank có một từ thừa, biến đổi từ gốc thành tính từ |
| Grammar 4–5 | Conditional Sentences - Two Verb Forms | Điền hai dạng động từ trong câu điều kiện |
| Grammar 6 | Reported Commands | Viết lại câu yêu cầu/mệnh lệnh gián tiếp theo reporting verb |
| Grammar 7 | Reported Speech / Direct Speech Transformation | Chuyển đổi giữa câu trực tiếp và gián tiếp |
| Grammar 8 | Past Simple Passive Transformation | Đổi câu chủ động sang bị động ở quá khứ đơn |
| Grammar 9 | Reported Speech Verb Choice | Chọn `said` hoặc `told` để hoàn thành câu |
| Reading | Reading Comprehension - Multiple Choice | Một bài đọc và các câu hỏi trắc nghiệm A–D |
| Writing | Short Message/Email hoặc Story Writing | Viết thư/tin nhắn hoặc truyện theo prompt |

Với Vocabulary/Grammar PP, hãy chọn loại PP tương ứng thay vì một dạng chung có vẻ gần giống. Loại PP giữ đúng cấu trúc đề, chỗ trống, answer key và cách tính điểm.

### Điểm và Writing

- Tổng mục tiêu của phần tự chấm là 50 điểm; giáo viên có thể cấu hình điểm cho mỗi đáp án.
- Writing được chấm riêng /10, không cộng vào tổng tự chấm /50.
- Rubric Prepare gồm Content, Communicative Achievement, Organisation và Language; mỗi tiêu chí 2.5 điểm.
- Prompt thư Prepare hiện hướng đến bài khoảng 80 từ. Khi tạo đề thực tế, vẫn kiểm tra lại yêu cầu và số từ trên đề giáo viên cung cấp.

## Listening

Skill Listening hiện dùng nhóm dạng nghe chung của template `exam-listening-v1` trong cấu hình Prepare:

- Notes Completion.
- Table Completion.
- Fill.
- Multiple Choice A/B/C hoặc A/B/C/D.
- Matching.

Chọn dạng theo cách học sinh phải trả lời sau khi nghe; không đưa phần Reading vào Listening chỉ vì cùng xuất hiện trong một đề tổng hợp.

## Speaking

Chưa có skill hoặc question type Speaking được cấu hình cho Prepare.

## Nguồn cấu hình

- [Question types dùng trong builder](../../frontend/src/shared/config/questionTypes.js)
- [Helper, định dạng linh hoạt, điểm và validation Prepare](../../frontend/src/domains/exam-levels/prepare/prepareReadingWriting.js)
- [Question types được phép lưu ở backend](../../backend/modules/examLevels/prepareReadingWriting.js)
- [Rubric Writing Prepare](../../frontend/src/shared/config/prepareWritingRubric.js)
- [Runtime bài làm](../../frontend/src/domains/exam-core/shared/pages/ExamCoreReadingRuntimePage.jsx)
