const { DataTypes } = require('sequelize');
const sequelize = require('../../db');

const createPartTestModel = ({
  modelName,
  tableName,
  defaultDuration,
  includeMainAudio = false,
}) => {
  const attributes = {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    classCode: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    teacherName: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: '',
    },
    testType: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    parts: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    totalQuestions: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    duration: {
      type: DataTypes.INTEGER,
      defaultValue: defaultDuration,
      comment: 'Duration in minutes',
    },
    status: {
      type: DataTypes.ENUM('draft', 'published', 'archived'),
      defaultValue: 'draft',
    },
    showResultModal: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    studentResultVisibility: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'score',
    },
    createdBy: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  };

  if (includeMainAudio) {
    attributes.mainAudioUrl = {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Global audio file URL for the entire listening test',
    };
  }

  return sequelize.define(modelName, attributes, {
    tableName,
    timestamps: true,
  });
};

const createPlatformSubmissionModel = ({ modelName, tableName }) =>
  sequelize.define(
    modelName,
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      testId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      testType: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      testTitle: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      studentName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      studentPhone: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      studentEmail: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      classCode: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      answers: {
        type: DataTypes.JSON,
        allowNull: false,
      },
      score: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      totalQuestions: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      percentage: {
        type: DataTypes.FLOAT,
        defaultValue: 0,
      },
      detailedResults: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      timeSpent: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      timeRemaining: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      teacherName: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      feedback: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      responseFeedback: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      feedbackBy: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      feedbackAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      feedbackSeen: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      status: {
        type: DataTypes.ENUM('submitted', 'reviewed', 'archived'),
        defaultValue: 'submitted',
      },
      finished: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: true,
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      lastSavedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      progressMeta: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      submittedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName,
      timestamps: true,
      indexes: [
        { fields: ['testId', 'testType'] },
        { fields: ['studentName'] },
        { fields: ['classCode'] },
        { fields: ['userId'] },
        { fields: ['submittedAt'] },
      ],
    }
  );

module.exports = {
  createPartTestModel,
  createPlatformSubmissionModel,
};
