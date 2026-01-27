import { generateDetailsFromSections } from '../pages/ListeningResults';

describe('generateDetailsFromSections', () => {
  test('handles multi-select as 2 slots and subsequent sections start at correct numbers', () => {
    const testObj = {
      partInstructions: [
        { sections: [ { sectionTitle: 'Questions 1-10', questionType: 'form-completion' } ] },
        { sections: [ { sectionTitle: 'Questions 11-14', questionType: 'abc' }, { sectionTitle: 'Questions 15-20', questionType: 'matching' } ] },
        { sections: [ { sectionTitle: 'Questions 21-22', questionType: 'multi-select' }, { sectionTitle: 'Questions 23-27', questionType: 'matching' }, { sectionTitle: 'Questions 28-30', questionType: 'abc' } ] }
      ],
      questions: [
        // Part 1: form-completion with answers map 1..10
        { partIndex: 0, sectionIndex: 0, questionIndex: 0, answers: { '1': 'a','2':'b','3':'c','4':'d','5':'e','6':'f','7':'g','8':'h','9':'i','10':'j' } },
        // Part 2: abc 11-14
        { partIndex: 1, sectionIndex: 0, questionIndex: 0, questionText: '11 question', correctAnswer: 'A' },
        { partIndex: 1, sectionIndex: 0, questionIndex: 1, questionText: '12 question', correctAnswer: 'B' },
        { partIndex: 1, sectionIndex: 0, questionIndex: 2, questionText: '13 question', correctAnswer: 'C' },
        { partIndex: 1, sectionIndex: 0, questionIndex: 3, questionText: '14 question', correctAnswer: 'A' },
        // Part 2: matching 15-20 (answers map)
        { partIndex: 1, sectionIndex: 1, questionIndex: 0, answers: { '15': 'F','16':'G','17':'E','18':'A','19':'C','20':'B' } },
        // Part 3: multi-select (21-22) - one question with requiredAnswers = 2
        { partIndex: 2, sectionIndex: 0, questionIndex: 0, questionText: '21-22 Which TWO', requiredAnswers: 2, correctAnswer: 'B,D' },
        // Part 3: matching 23-27
        { partIndex: 2, sectionIndex: 1, questionIndex: 0, answers: { '23': 'D','24':'A','25':'C','26':'G','27':'F' } },
        // Part 3: abc 28-30
        { partIndex: 2, sectionIndex: 2, questionIndex: 0, questionText: '28 q', correctAnswer: 'A' },
        { partIndex: 2, sectionIndex: 2, questionIndex: 1, questionText: '29 q', correctAnswer: 'B' },
        { partIndex: 2, sectionIndex: 2, questionIndex: 2, questionText: '30 q', correctAnswer: 'C' }
      ]
    };

    const answers = {
      q21: ['1','3'], // student choices for group at q21
      q23: 'D',
      q24: 'A',
      q25: 'C',
      q26: 'G',
      q27: 'F',
      q28: 'A',
    };

    const details = generateDetailsFromSections(testObj, answers);

    // find multi-select slots
    const slot21 = details.find(d => d.questionNumber === 21 && d.sectionIndex === 0);
    const slot22 = details.find(d => d.questionNumber === 22 && d.sectionIndex === 0);
    expect(slot21).toBeDefined();
    expect(slot22).toBeDefined();

    // next section matching should start at 23..27
    for (let n = 23; n <= 27; n++) {
      const row = details.find(d => d.questionNumber === n && d.sectionIndex === 1);
      expect(row).toBeDefined();
    }

    // abc should be 28-30
    for (let n = 28; n <= 30; n++) {
      const row = details.find(d => d.questionNumber === n && d.sectionIndex === 2);
      expect(row).toBeDefined();
    }

    // total count should equal sum: 10 + 4 + 6 + 2 + 5 + 3 = 30
    expect(details.length).toBe(30);
  });
});