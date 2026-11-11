# Gateway

Gateway hiện có hai skill:

1. **Reading-Writing** — đọc, ngữ pháp, từ vựng và viết trong cùng một đề.
2. **Listening** — đề nghe riêng.

Chưa có skill Speaking hoặc Writing riêng tách khỏi Reading-Writing.

## Reading-Writing

Cấu trúc cấu hình gồm các nhóm:

- Grammar.
- Vocabulary.
- Use of English.
- Reading.
- Writing.

Các dạng câu hỏi trong builder:

- Fill và Multiple Choice A/B/C.
- Matching.
- Cloze Test và Multiple Choice Cloze.
- Long Text Multiple Choice.
- Word Form.
- Sentence Transformation và Sentence Correction.
- True/False/Not Given.
- Reading Open Questions.
- Short Message và Story Writing.

Writing được chấm riêng theo rubric, không nên nhầm với các câu tự chấm. Rubric Gateway hiện có bốn tiêu chí, mỗi tiêu chí 2.5 điểm: Task Achievement, Grammar, Vocabulary và Cohesion/Coherence.

**Chọn Reading-Writing** khi đề có một hoặc nhiều phần đọc/ngữ pháp/từ vựng và có thể kèm một task viết. Với bài viết dài, chọn Short Message hoặc Story Writing theo yêu cầu của đề, không dùng Reading Open Questions thay cho bài viết tự do.

## Listening

Cấu trúc cấu hình gồm Notes Completion và Multiple Choice. Các dạng sẵn có trong menu:

- Notes Completion.
- Table Completion.
- Fill.
- Multiple Choice A/B/C hoặc A/B/C/D.
- Matching.

Chọn Listening khi câu hỏi dựa trên audio. Dùng Notes/Table Completion nếu học sinh cần điền thông tin vào ghi chú hoặc bảng; dùng Multiple Choice nếu đề yêu cầu chọn phương án.

## Speaking

Chưa có builder hoặc dạng câu hỏi Speaking được cấu hình cho Gateway.

## Nguồn cấu hình

- [Danh sách skill Gateway](../../frontend/src/domains/gateway/config/skills.js)
- [Danh sách dạng câu hỏi và cấu trúc Gateway](../../frontend/src/shared/config/questionTypes.js)
- [Rubric Gateway Writing](../../frontend/src/shared/config/gatewayWritingRubric.js)
