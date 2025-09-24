const { Sequelize } = require('sequelize');
require('dotenv').config();

// Chọn cấu hình DB theo môi trường
const isProd = process.env.NODE_ENV === 'production';

const sequelize = new Sequelize(
  isProd ? process.env.PROD_DB_NAME : process.env.DB_NAME,
  isProd ? process.env.PROD_DB_USER : process.env.DB_USER,
  isProd ? process.env.PROD_DB_PASS : process.env.DB_PASS,
  {
    host: isProd ? process.env.PROD_DB_HOST : process.env.DB_HOST || 'localhost',
    dialect: 'mysql',
    port: 3306,
    logging: false,
  }
);
// Thêm đoạn code này vào backend/db.js
sequelize.authenticate()
  .then(() => {
    console.log('✅ Kết nối database thành công');
  })
  .catch(err => {
    console.error('❌ Lỗi kết nối database:', err);
  });
module.exports = sequelize;
