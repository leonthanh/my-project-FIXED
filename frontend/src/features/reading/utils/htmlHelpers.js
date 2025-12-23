/**
 * HTML Helper Functions for Reading Test
 * Các hàm xử lý HTML từ Quill Editor
 */

/**
 * Loại bỏ HTML tags, trả về text thuần
 * @param {string} html - HTML string
 * @returns {string} Plain text
 */
export const stripHtml = (html) => {
  if (!html) return '';
  const temp = document.createElement('div');
  temp.innerHTML = html;
  return temp.textContent || temp.innerText || '';
};

/**
 * Dọn dẹp HTML từ Quill editor - xóa các thẻ rỗng
 * @param {string} html - HTML từ Quill
 * @returns {string} HTML đã được dọn dẹp
 */
export const cleanupPassageHTML = (html) => {
  if (!html) return '';
  
  // Remove empty <p><br></p> tags
  let cleaned = html.replace(/<p><br><\/p>/g, '');
  
  // Remove multiple consecutive empty paragraphs
  cleaned = cleaned.replace(/<p><\/p>/g, '');
  
  // Remove excessive whitespace-only paragraphs
  cleaned = cleaned.replace(/<p>\s*<\/p>/g, '');
  
  // Replace multiple <br> with single <br>
  cleaned = cleaned.replace(/<br>\s*<br>/g, '<br>');
  
  // Trim whitespace
  cleaned = cleaned.trim();
  
  return cleaned;
};

/**
 * Convert File to Base64 string
 * @param {File} file - File object
 * @returns {Promise<string>} Base64 string
 */
export const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
};
