# Cẩm nang chọn đề theo level và kỹ năng

Tài liệu này tóm tắt các kỹ năng và dạng câu hỏi mà ứng dụng hiện đang cấu hình cho IX, Orange, Gateway, Prepare và General. Đây là hướng dẫn theo mã nguồn của dự án, không thay thế đề cương chính thức của từng kỳ thi.

## Chọn đúng level và kỹ năng

| Level | Reading | Listening | Writing | Speaking |
|---|---|---|---|---|
| [IX](./ix.md) | Đề riêng | Đề riêng | Đề riêng, gồm Task 1 và Task 2 | Chưa có cấu hình |
| [Orange](./orange.md) | KET, PET, Flyers, Movers, Starters | KET, PET, Movers; Flyers/Starters chưa có cấu hình tạo nghe hoàn chỉnh | PET có đề riêng; một số dạng viết nằm trong bài Reading | Chưa có cấu hình |
| [Gateway](./gateway.md) | Gộp trong Reading-Writing | Đề riêng | Là một phần của Reading-Writing | Chưa có cấu hình |
| [Prepare](./prepare.md) | Gộp trong Reading & Writing | Đề riêng | Là một phần của Reading & Writing | Chưa có cấu hình |
| [General](./general.md) | Tab hiện tên Reading & Writing; cấu hình tạo đề hiện tại thiên về Reading | Đề riêng | Chưa có kỹ năng Writing riêng trong cấu hình hiện tại | Chưa có cấu hình |

## Chọn dạng theo cách học sinh trả lời

| Học sinh cần làm gì? | Nhóm dạng nên chọn |
|---|---|
| Chọn một đáp án | Multiple Choice A/B/C hoặc A/B/C/D |
| Chọn nhiều đáp án | Multi-select |
| Điền từ hoặc cụm từ ngắn | Fill / gap fill / open cloze |
| Ghép người, thông tin hoặc lựa chọn | Matching |
| Đọc đoạn văn rồi trả lời | Long-text multiple choice hoặc Reading Comprehension |
| Đánh giá đúng/sai/không có thông tin | True/False/Not Given |
| Biến đổi từ hoặc viết lại câu | Word Form / Sentence Transformation; với bài Prepare theo đề mẫu, dùng đúng loại PP tương ứng |
| Viết email, tin nhắn, thư hoặc truyện | Chọn phần Writing được thiết kế cho level đó; không dùng dạng điền từ thay cho bài viết |
| Nói trực tiếp hoặc ghi âm câu trả lời | Chưa có kỹ năng Speaking trong cấu hình của năm level này |

## Những điểm cần lưu ý

- Tên loại câu hỏi có thể xuất hiện trong nhiều level, nhưng không có nghĩa là mọi dạng đều phù hợp với mọi kỹ năng. Hãy xem cấu trúc Part trong trang level tương ứng.
- Menu Listening của KET/PET hiện dùng chung một nhóm lựa chọn rộng, trong đó có thể có dạng Reading. Khi tạo đề nghe, chỉ chọn dạng phù hợp với Part nghe.
- Flyers và Starters khai báo Listening trong một số metadata, nhưng hiện chưa có test config và đường dẫn tạo Listening riêng như KET/PET/Movers. Không nên dùng tab này để tạo đề nghe cho đến khi cấu hình được hoàn thiện.
- General có cấu hình cũ `general-reading` chứa một số dạng Writing, nhưng trang tạo đề hiện sử dụng `general-reading-60`. Hai cấu hình không giống nhau; xem [General](./general.md) trước khi tạo yêu cầu Writing.
- Speaking chưa có luồng tạo đề riêng cho IX, Orange, Gateway, Prepare hoặc General.

## Tài liệu từng level

- [IX](./ix.md)
- [Orange](./orange.md)
- [Gateway](./gateway.md)
- [Prepare](./prepare.md)
- [General](./general.md)

## Dùng tài liệu trong các lần làm việc sau

Khi chỉnh sửa builder hoặc hướng dẫn giáo viên, hãy đọc trang level liên quan và đối chiếu phần “Nguồn cấu hình” ở cuối trang với mã nguồn hiện tại. Nếu menu hoặc cấu trúc đề thay đổi, cập nhật tài liệu tương ứng để tránh hướng dẫn lỗi thời.
