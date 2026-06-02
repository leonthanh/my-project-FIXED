import { getQuestionTypesForTest } from '../questionTypes';

describe('questionTypes config', () => {
  test('excludes gap-match from KET listening builder options', () => {
    const typeIds = getQuestionTypesForTest('ket-listening').map((type) => type.id);

    expect(typeIds).not.toContain('gap-match');
  });
});