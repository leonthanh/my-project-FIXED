import { getQuestionTypesForTest } from '../questionTypes';

describe('questionTypes config', () => {
  test('includes gap-match in KET listening builder options', () => {
    const typeIds = getQuestionTypesForTest('ket-listening').map((type) => type.id);

    expect(typeIds).toContain('gap-match');
  });
});
