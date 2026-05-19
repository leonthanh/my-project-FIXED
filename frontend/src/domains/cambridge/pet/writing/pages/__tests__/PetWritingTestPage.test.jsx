import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import PetWritingTestPage from '../PetWritingTestPage';
import {
  buildPetPart1Html,
  buildPetQuestion2Html,
  buildPetQuestion3Html,
} from '../petWritingTemplateUtils';

jest.mock('../../../../../../shared/utils/api', () => ({
  apiPath: jest.fn((path) => path),
  hostPath: jest.fn((path) => path),
  redirectInApp: jest.fn(),
  redirectToLogin: jest.fn(),
}));

jest.mock('../../../../../../shared/components/TestHeader', () => () => <div data-testid="test-header" />);
jest.mock('../../../../../../shared/components/TestStartModal', () => () => <div data-testid="test-start-modal" />);

jest.mock('../../../../../../shared/utils/placementTests', () => ({
  buildPlacementAttemptPath: jest.fn(() => '/placement/attempt'),
  readPlacementRuntimeContext: jest.fn(() => ({
    isPlacementRuntime: false,
    placementAttemptItemToken: '',
    placementAttemptToken: '',
  })),
}));

const originalFetch = global.fetch;

const templateTestData = {
  id: 29,
  title: 'PET Writing Practice 29',
  classCode: 'AUTHENTIC PRACTICE TEST 1',
  teacherName: 'Thanh Le',
  task1: buildPetPart1Html({
    from: 'Alex',
    to: 'Banh Beo StarEdu',
    subject: 'College science presentation',
  }),
  part2Question2: buildPetQuestion2Html({
    title: 'Is shopping boring?',
  }),
  part2Question3: buildPetQuestion3Html({
    storyStarter: 'Jack climbed out of the boat and ran as fast as he could to the beach.',
  }),
  task1Image: '',
};

const renderStartedPetWritingPage = async () => {
  localStorage.setItem('selectedPetWritingTestId', '29');
  localStorage.setItem('pet_writing_started', 'true');
  localStorage.setItem('pet_writing_timeLeft', '2700');
  localStorage.setItem('pet_writing_endAt', String(Date.now() + 2700 * 1000));

  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      json: async () => templateTestData,
    })
  );

  render(
    <MemoryRouter initialEntries={['/pet-writing']}>
      <Routes>
        <Route path="/pet-writing" element={<PetWritingTestPage />} />
      </Routes>
    </MemoryRouter>
  );

  await waitFor(() => {
    expect(global.fetch).toHaveBeenCalledWith('writing-tests/detail/29');
  });
};

describe('PetWritingTestPage template prompt rendering', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    localStorage.clear();
  });

  test('does not render the extra outer Part 1 heading for template prompts', async () => {
    await renderStartedPetWritingPage();

    expect(await screen.findByText('Question 1')).toBeInTheDocument();
    expect(screen.getByText('Write your answer in about 100 words on the answer sheet.')).toBeInTheDocument();
    expect(screen.queryByText('You must answer this question. Write about 100 words.')).not.toBeInTheDocument();
    expect(document.querySelector('.pet-writing-passage .pet-writing-section-label')).toBeNull();
  });

  test('does not render the extra outer Part 2 heading for template prompts', async () => {
    await renderStartedPetWritingPage();

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    expect(await screen.findByText('Is shopping boring?')).toBeInTheDocument();
    expect(screen.getByText('Answer one of the questions 2 or 3. Write your answer in about 100 words on the answer sheet.')).toBeInTheDocument();
    expect(screen.queryByText('Answer one of the questions (2 or 3). Write about 100 words.')).not.toBeInTheDocument();
    expect(document.querySelector('.pet-writing-passage .pet-writing-question-chip')).toBeNull();
  });
});