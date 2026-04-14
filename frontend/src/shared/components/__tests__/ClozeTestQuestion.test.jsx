import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import ClozeTestQuestion from '../ClozeTestQuestion';

describe('ClozeTestQuestion', () => {
  test('keeps multiline teacher input in reading cloze table mode', () => {
    const onChange = jest.fn();

    render(
      <ClozeTestQuestion
        question={{
          questionNumber: 21,
          questionType: 'cloze-test',
          tableMode: true,
          clozeTable: {
            columns: ['Test', 'Findings'],
            rows: [{ cells: ['', ''] }],
          },
          blanks: [],
        }}
        onChange={onChange}
      />
    );

    const testCell = screen.getByPlaceholderText('Test');
    fireEvent.change(testCell, {
      target: { value: 'Line one\nLine two [BLANK]' },
    });

    expect(testCell).toHaveValue('Line one\nLine two [BLANK]');

    const latestQuestion = onChange.mock.calls.at(-1)[0];
    expect(latestQuestion.clozeTable.rows[0].cells[0]).toBe('Line one\nLine two [BLANK]');
    expect(latestQuestion.blanks).toHaveLength(1);
  });
});