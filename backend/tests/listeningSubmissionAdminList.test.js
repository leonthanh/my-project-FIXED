jest.mock('../models/ListeningSubmission', () => ({
  findAll: jest.fn(),
}));
jest.mock('../models/ListeningTest', () => ({
  findAll: jest.fn(),
}));
jest.mock('../models/User', () => ({}));
jest.mock('../modules/placement/service', () => ({
  getPlacementContactsForRuntimeSubmissions: jest.fn().mockResolvedValue(new Map()),
}));

const express = require('express');
const request = require('supertest');
const ListeningSubmission = require('../models/ListeningSubmission');
const ListeningTest = require('../models/ListeningTest');
const router = require('../routes/listening-submission');

describe('GET /listening-submissions/admin/list', () => {
  beforeEach(() => {
    const numberWords = [
      'one', 'two', 'three', 'four', 'five', 'six',
      'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
    ];
    const test = {
      id: 8,
      title: 'Listening test',
      questions: Array.from({ length: 40 }, (_, index) => ({
        partIndex: 0,
        sectionIndex: 0,
        questionIndex: index,
        correctAnswer: index < numberWords.length ? numberWords[index] : `expected-${index + 1}`,
      })),
      partInstructions: [{ sections: [{ questionType: 'fill-in-the-blank', startingQuestionNumber: 1 }] }],
      toJSON() {
        return {
          id: this.id,
          title: this.title,
          questions: this.questions,
          partInstructions: this.partInstructions,
        };
      },
    };
    const answers = Object.fromEntries(
      Array.from({ length: 40 }, (_, index) => [
        `q${index + 1}`,
        index < numberWords.length ? String(index + 1) : 'incorrect',
      ])
    );

    ListeningSubmission.findAll.mockResolvedValue([
      {
        id: 437,
        testId: 8,
        answers,
        details: [],
        toJSON() {
          return {
            id: this.id,
            testId: this.testId,
            answers: this.answers,
            details: this.details,
          };
        },
      },
    ]);
    ListeningTest.findAll.mockResolvedValue([test]);
  });

  test('summarizes with the same number-aware answer matching as the detail page', async () => {
    const app = express();
    app.use('/listening-submissions', router);

    const response = await request(app).get('/listening-submissions/admin/list');

    expect(response.status).toBe(200);
    expect(response.body[0]).toMatchObject({
      id: 437,
      computedCorrect: 12,
      computedTotal: 40,
      computedPercentage: 30,
      correct: 12,
      total: 40,
      scorePercentage: 30,
    });
  });
});
