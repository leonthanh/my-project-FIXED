const { DataTypes } = require("sequelize");
const sequelize = require("../db");
const bcrypt = require("bcryptjs"); // Import thư viện bcryptjs

const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true, // 👈 Bắt buộc để liên kết foreign key
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    password: {
      // ✅ Trường password
      type: DataTypes.STRING,
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM("student", "teacher", "admin"),
      defaultValue: "student",
    },
  },
  {
    tableName: "users",
    timestamps: true,
  }
);

// Check for duplicate phone before create
User.beforeCreate(async (user, options) => {
  const existingUser = await User.findOne({ where: { phone: user.phone } });
  if (existingUser) {
    throw new Error("Phone number already exists");
  }

  if (user.password) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(user.password, salt);
    user.password = hashedPassword;
  }
});

// Check for duplicate phone before update
User.beforeUpdate(async (user, options) => {
  if (user.changed("phone")) {
    const existingUser = await User.findOne({
      where: {
        phone: user.phone,
        id: { [sequelize.Sequelize.Op.ne]: user.id }, // Exclude current user
      },
    });
    if (existingUser) {
      throw new Error("Phone number already exists");
    }
  }

  if (user.changed("password")) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(user.password, salt);
    user.password = hashedPassword;
  }
});

// ✅ Phương thức so sánh mật khẩu
User.prototype.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = User;
