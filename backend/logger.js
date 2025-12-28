const fs = require('fs');
const path = require('path');

// Tạo hoặc ghi tiếp vào file error.log trong thư mục backend
const logStream = fs.createWriteStream(path.join(__dirname, 'error.log'), { flags: 'a' });

/**
 * Ghi lỗi vào file error.log với timestamp
 * @param {string} message - Mô tả lỗi
 * @param {Error|string} error - Đối tượng lỗi hoặc chuỗi lỗi
 */
function logError(message, error) {
  const timestamp = new Date().toISOString();
  const errorMessage = error instanceof Error ? error.stack : error;
  logStream.write(`[${timestamp}] ${message}: ${errorMessage}\n`);
}

module.exports = { logError };