# General

General hiện có hai skill trên hub:

- **Reading & Writing** — trang tạo đề hiện dùng cấu hình `general-reading-60`.
- **Listening** — đề nghe riêng.

Chưa có skill Speaking. General cũng chưa có một luồng Writing riêng trong cấu hình tạo đề hiện tại.

## Reading & Writing

Cấu hình hiện hành `general-reading-60` được tổ chức thành tám nhóm:

1. Matching phrases.
2. Prepositions & Phrasal Verbs Gap Fill.
3. Odd One Out.
4. Inline Choice hoàn thành hội thoại.
5. Sentence Correction.
6. Reading Open Questions / comprehension.
7. Cloze Test.
8. Multiple Choice dạng Best Response.

Các kiểu trả lời trong menu gồm Matching, Preposition Gap Fill, Odd One Out, Inline Choice, Sentence Correction, Reading Open Questions, Cloze Test và Multiple Choice A/B/C hoặc A/B/C/D.

### Lưu ý về Writing

Trong registry vẫn còn cấu hình cũ `general-reading` có Short Message và Story Writing. Tuy nhiên trang tạo đề General hiện trỏ đến `general-reading-60`; không nên giả định rằng các dạng Writing cũ cũng có trong menu hiện tại.

Nếu yêu cầu là tạo một đề viết độc lập, hãy dừng lại để xác nhận luồng phù hợp thay vì chọn một dạng câu hỏi Reading. Hiện IX Writing, PET Writing và Prepare Writing có các luồng viết rõ ràng hơn, mỗi luồng dùng rubric/yêu cầu riêng.

## Listening

Cấu hình có bốn phần:

1. Nghe và chọn đáp án.
2. Điền một từ, số, ngày hoặc giờ.
3. Nghe và chọn đáp án.
4. Đánh dấu Right/Wrong.

Các dạng được đăng ký là Multiple Choice A/B/C, Fill, Matching và True/False/Not Given.

## Speaking

Chưa có skill hoặc bộ câu hỏi Speaking được cấu hình cho General.

## Nguồn cấu hình

- [Danh sách kỹ năng và test config hiện hành](../../frontend/src/domains/general/generalConfig.js)
- [Navigation General](../../frontend/src/domains/general/config/navigation.js)
- [Cấu trúc test và question types](../../frontend/src/shared/config/questionTypes.js)
- [General builder](../../frontend/src/domains/general/shared/components/GeneralTestBuilder.jsx)
