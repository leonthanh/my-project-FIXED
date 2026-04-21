import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  renderHtmlWithBlankPlaceholders,
  renderHtmlWithPlaceholderPattern,
  sentenceCompletionPlaceholderPattern,
} from '../htmlHelpers';

describe('renderHtmlWithBlankPlaceholders', () => {
  it('preserves paragraph and list structure while inserting blanks', () => {
    const html = [
      '<p>Books &amp; Literature</p>',
      '<p>Early changes in Mesopotamia [BLANK]</p>',
      '<ul><li>Temples needed [BLANK] to manage the farms</li></ul>',
    ].join('');

    const { container } = render(
      <div>
        {renderHtmlWithBlankPlaceholders(html, (blankIndex, key) => (
          <span key={key} data-testid={`blank-${blankIndex}`}>
            [{blankIndex}]
          </span>
        ))}
      </div>
    );

    expect(container.querySelectorAll('p')).toHaveLength(2);
    expect(container.querySelectorAll('ul')).toHaveLength(1);
    expect(container.querySelectorAll('li')).toHaveLength(1);
    expect(screen.getByTestId('blank-0').closest('p')).not.toBeNull();
    expect(screen.getByTestId('blank-1').closest('li')).not.toBeNull();
    expect(screen.getByText(/Books & Literature/i)).toBeInTheDocument();
  });

  it('preserves Quill classes and inline styles for formatted headings', () => {
    const html = '<p class="ql-align-center"><strong style="color: rgb(153, 51, 255);">Books &amp; Literature</strong></p>';

    const { container } = render(
      <div>
        {renderHtmlWithBlankPlaceholders(html, (blankIndex, key) => (
          <span key={key}>[{blankIndex}]</span>
        ))}
      </div>
    );

    const paragraph = container.querySelector('p.ql-align-center');
    const heading = screen.getByText('Books & Literature');

    expect(paragraph).not.toBeNull();
    expect(heading.tagName).toBe('STRONG');
    expect(heading).toHaveStyle({ color: 'rgb(153, 51, 255)' });
  });

  it('supports sentence-completion dot and underscore placeholders without flattening HTML structure', () => {
    const html = [
      '<p><strong>Art and the Brain</strong></p>',
      '<p>Neurological studies show how painting affects our …………</p>',
      '<p>_____ can also appear at the start of a sentence.</p>',
    ].join('');

    const { container } = render(
      <div>
        {renderHtmlWithPlaceholderPattern(
          html,
          (blankIndex, key) => (
            <span key={key} data-testid={`sentence-blank-${blankIndex}`}>
              [{blankIndex}]
            </span>
          ),
          sentenceCompletionPlaceholderPattern
        )}
      </div>
    );

    expect(container.querySelectorAll('p')).toHaveLength(3);
    expect(screen.getByTestId('sentence-blank-0').closest('p')).not.toBeNull();
    expect(screen.getByTestId('sentence-blank-1').closest('p')).not.toBeNull();
    expect(container.querySelector('strong')).not.toBeNull();
  });
});