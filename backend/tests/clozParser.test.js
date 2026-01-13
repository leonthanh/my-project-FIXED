/**
 * Test for clozParser normalizeQuestion function
 * Ensures that 'answer' field is properly renamed to 'correctAnswer'
 */

const { normalizeQuestion, processTestParts } = require('../utils/clozParser');

// Test normalizeQuestion
const testQuestion1 = {
  index: 1,
  questionText: 'What is the answer?',
  answer: 'C',  // Old format
  options: ['A', 'B', 'C']
};

const testQuestion2 = {
  index: 2,
  questionText: 'What is the correct answer?',
  correctAnswer: 'B',  // Already normalized
  options: ['A', 'B', 'C']
};

const testQuestion3 = {
  index: 3,
  questionText: 'About',
  answer: 'about'  // String answer
};

console.log('Testing normalizeQuestion...\n');

const normalized1 = normalizeQuestion(testQuestion1);
console.log('Input (with answer field):', testQuestion1);
console.log('Output (normalized):', normalized1);
console.log('Has correctAnswer?', 'correctAnswer' in normalized1);
console.log('correctAnswer value:', normalized1.correctAnswer);
console.log('');

const normalized2 = normalizeQuestion(testQuestion2);
console.log('Input (already normalized):', testQuestion2);
console.log('Output (unchanged):', normalized2);
console.log('');

const normalized3 = normalizeQuestion(testQuestion3);
console.log('Input (string answer):', testQuestion3);
console.log('Output (normalized):', normalized3);
console.log('correctAnswer value:', normalized3.correctAnswer);
console.log('');

// Test processTestParts
const testParts = [
  {
    partIndex: 0,
    sections: [
      {
        questionType: 'long-text-mc',
        questions: [
          {
            questionText: 'Q1',
            answer: 'A'  // Should be renamed
          },
          {
            questionText: 'Q2',
            answer: 'B'
          }
        ]
      }
    ]
  },
  {
    partIndex: 1,
    sections: [
      {
        questionType: 'cloze-test',
        questions: [
          {
            questionText: 'Q3',
            answer: 'about',
            passageText: 'Test (3) passage'
          }
        ]
      }
    ]
  }
];

console.log('Testing processTestParts...\n');
const processedParts = processTestParts(testParts);
console.log('Processed Part 0, Section 0, Question 0:');
console.log(processedParts[0].sections[0].questions[0]);
console.log('');

console.log('Processed Part 1, Section 0, Question 0:');
console.log(processedParts[1].sections[0].questions[0]);
console.log('');

// Verify correctAnswer exists and answer doesn't
console.log('✅ Verification:');
console.log('Part 0 Q0 has correctAnswer:', 'correctAnswer' in processedParts[0].sections[0].questions[0]);
console.log('Part 0 Q0 has answer:', 'answer' in processedParts[0].sections[0].questions[0]);
console.log('Part 1 Q0 has correctAnswer:', 'correctAnswer' in processedParts[1].sections[0].questions[0]);
console.log('Part 1 Q0 has answer:', 'answer' in processedParts[1].sections[0].questions[0]);
