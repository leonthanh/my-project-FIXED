const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const RefreshToken = sequelize.define(
  'RefreshToken',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    tokenHash: {
      type: DataTypes.STRING(64),
      allowNull: false,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    revokedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    userAgent: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    ip: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
  },
  {
    tableName: 'refresh_tokens',
    timestamps: true,
    indexes: [
      { name: 'refresh_tokens_user_id_idx', fields: ['userId'] },
      { name: 'refresh_tokens_expires_at_idx', fields: ['expiresAt'] },
      {
        name: 'refresh_tokens_token_hash_unique',
        unique: true,
        fields: ['tokenHash'],
      },
    ],
  }
);

module.exports = RefreshToken;
