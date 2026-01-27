import React from 'react';
import { render, screen } from '@testing-library/react';
import AdminReadingSubmissions from '../AdminReadingSubmissions';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '../../../../shared/contexts/ThemeContext';

beforeEach(() => {
  // Mock localStorage for teacher user
  Storage.prototype.getItem = jest.fn((key) => {
    if (key === 'user') return JSON.stringify({ name: 'Test Teacher', role: 'teacher' });
    return null;
  });
  jest.spyOn(global, 'fetch').mockImplementation(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) }));
});
afterEach(() => jest.restoreAllMocks());

test('renders header and fetches submissions', async () => {
  // make fetch return 1 submission so the table renders - match new data structure
  const sample = [{ 
    id: 1, 
    testId: '1',
    userName: 'Student1', 
    correct: 5, 
    total: 10, 
    band: 5, 
    scorePercentage: 50,
    feedback: null,
    feedbackBy: null,
    createdAt: new Date().toISOString(),
    ReadingTest: { id: 1, classCode: 'C1', teacherName: 'Teacher1', title: 'Test 1' },
    User: { phone: '0123456789' }
  }];
  
  global.fetch.mockImplementation((url) => {
    // Match the new admin/list endpoint
    if (url.includes('reading-submissions/admin/list')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(sample) });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
  });

  render(
    <MemoryRouter>
      <ThemeProvider>
        <AdminReadingSubmissions />
      </ThemeProvider>
    </MemoryRouter>
  );

  // Ensure the mocked row appears
  expect(await screen.findByText(/Reading Submissions/i)).toBeInTheDocument();
  expect(await screen.findByText(/Student1/)).toBeInTheDocument();
  expect(screen.getByText(/Mã lớp/)).toBeInTheDocument();
  expect(screen.getByText(/Giáo viên/)).toBeInTheDocument();
});
