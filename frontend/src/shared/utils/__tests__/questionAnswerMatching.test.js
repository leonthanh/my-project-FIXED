import { getPrimaryAnswer, isAnswerAccepted } from '../questionAnswerMatching';

describe('question answer matching', () => {
  test('matches curly apostrophes and accepted alternatives', () => {
    expect(isAnswerAccepted('won’t come', "won't come|will not come")).toBe(true);
  });

  test('matches transformed answer blanks independently of the prompt text', () => {
    expect(isAnswerAccepted('don’t want to go cycling', "don't want to go cycling")).toBe(true);
    expect(isAnswerAccepted('looks great', 'That new soap opera looks great')).toBe(false);
    expect(getPrimaryAnswer('That new soap opera looks great')).toBe('That new soap opera looks great');
  });
});
