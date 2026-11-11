# Orange

Orange là nhóm level gồm KET, PET, Flyers, Movers và Starters. Dạng câu hỏi và kỹ năng phụ thuộc vào level con; không chọn theo tên Orange chung.

## Kỹ năng theo level con

| Level | Reading | Listening | Writing |
|---|---|---|---|
| KET | Có | Có | Short Message nằm trong bài Reading; không có tab Writing riêng |
| PET | Có | Có | Có đề PET Writing riêng; Reading cũng có phần Short Message |
| Flyers | Có | Metadata có khai báo, nhưng chưa có cấu hình/đường dẫn tạo Listening riêng | Một số câu viết nằm trong bài Reading |
| Movers | Có | Có | Một số câu viết nằm trong bài Reading |
| Starters | Có | Metadata có khai báo, nhưng chưa có cấu hình/đường dẫn tạo Listening riêng | Mô tả câu viết nằm trong bài Reading |

Chưa có cấu hình Speaking riêng cho các level Orange này.

## KET

### Reading & Writing

- Biển báo và tin nhắn: đọc hình/text ngắn rồi chọn A/B/C.
- People Matching: nối nhu cầu của người với các đoạn thông tin.
- Long Text MC: đọc đoạn văn dài rồi chọn đáp án.
- Multiple Choice Cloze: chọn từ cho chỗ trống trong đoạn.
- Open Cloze: tự điền từ.
- Word Formation: biến đổi từ.
- Short Message/Email: viết tin nhắn ngắn; đây là phần Writing nằm trong bài KET Reading & Writing.

### Listening

Cấu trúc hiển thị gồm hội thoại ngắn, hội thoại dài có câu hỏi trắc nghiệm hoặc điền từ, và độc thoại dài có Matching. Các kiểu trả lời phù hợp gồm Multiple Choice, Fill và Matching.

## PET

### Reading

Các dạng đầu tương tự KET: Signs & Messages, People Matching, Long Text MC và Multiple Choice Cloze. Các phần sau có Inline Choice, Word Formation/Open Cloze và Short Message/Email.

### Listening

Cấu trúc hiển thị gồm năm phần: hội thoại ngắn chọn đáp án, hội thoại dài điền thông tin hoặc chọn đáp án, và độc thoại dài dạng Matching.

**Lưu ý:** menu PET Listening hiện dùng nhóm lựa chọn dùng chung KET và có thể hiện cả dạng dành cho Reading. Khi tạo bài nghe, bám theo cấu trúc audio của từng Part; không chọn dạng chỉ phù hợp với bài đọc.

### Writing

PET Writing có hai task:

1. Viết email khoảng 100 từ.
2. Chọn một trong hai đề và viết khoảng 100 từ.

Đây là luồng Writing riêng. Không nhầm với Short Message nằm trong bài PET Reading.

## Flyers

Bài Reading có các dạng như ghép định nghĩa, điền hội thoại, chọn đáp án cho câu chuyện tranh, đọc hiểu và viết câu chuyện. Menu câu hỏi hiện gồm Picture Matching, Picture Multiple Choice, A/B/C và Fill.

## Movers

### Reading & Writing

Các kiểu bài trong cấu hình gồm:

- Ghép từ/tranh hoặc từ/định nghĩa.
- Image Cloze và Word Drag Cloze.
- Hoàn thành câu chuyện.
- Look, Read & Write.
- Multiple Choice, Tick/Cross, Cloze MC và Word Form.
- Short Message hoặc câu viết dựa trên hình.

### Listening

Cấu trúc gồm nghe và nối, nghe và điền, chọn tranh A/B/C, điền thông tin ngắn, và nghe rồi chọn/hoàn thành nội dung.

## Starters

Bài Reading gồm Word-Picture Matching, Tick/Cross, Word Gap Fill, Text Gap Fill và Picture Description. Menu hiện dùng Picture Matching, Tick/Cross và Fill.

## Cảnh báo về Flyers/Starters Listening

Metadata có liệt kê Listening cho Flyers và Starters, nhưng cấu hình test và đường dẫn tạo hiện chỉ được khai báo cho Reading. Hãy xác nhận với quản trị viên trước khi tạo đề nghe cho hai level này; không dùng cấu hình Reading thay cho Listening.

## Nguồn cấu hình

- [Danh sách level Orange](../../frontend/src/domains/cambridge/config/levels.js)
- [Navigation và chọn test config](../../frontend/src/domains/cambridge/config/navigation.js)
- [KET](../../frontend/src/domains/cambridge/ket/config.js)
- [PET](../../frontend/src/domains/cambridge/pet/config.js)
- [Flyers](../../frontend/src/domains/cambridge/flyers/config.js)
- [Movers](../../frontend/src/domains/cambridge/movers/config.js)
- [Starters](../../frontend/src/domains/cambridge/starters/config.js)
- [Cấu trúc đề và danh sách dạng câu hỏi](../../frontend/src/shared/config/questionTypes.js)
