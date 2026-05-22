import { normalizeQuillPromptHtml } from '../normalizeQuillPromptHtml';

describe('normalizeQuillPromptHtml', () => {
  test('removes empty quill paragraphs around short-message prompts', () => {
    const rawHtml = '<p><strong>In your email:</strong></p><p><br></p><ul><li>say which sport the competition was for</li><li>explain how you felt at the start of the competition</li></ul><p><br></p><p>Write <strong>25 words or more.</strong></p><p>Write the email on your answer sheet.</p>';

    expect(normalizeQuillPromptHtml(rawHtml)).toBe(
      '<p><strong>In your email:</strong></p><ul><li>say which sport the competition was for</li><li>explain how you felt at the start of the competition</li></ul><p>Write <strong>25 words or more.</strong></p><p>Write the email on your answer sheet.</p>'
    );
  });

  test('keeps non-empty prompt content unchanged', () => {
    const rawHtml = '<p>You took part in a sports competition at the weekend.</p><p>Write an email to your English friend, Robbie.</p>';

    expect(normalizeQuillPromptHtml(rawHtml)).toBe(rawHtml);
  });
});