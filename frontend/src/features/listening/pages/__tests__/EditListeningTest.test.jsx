import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import EditListeningTest from '../EditListeningTest';

jest.mock('../../components', () => ({
  ListeningTestEditor: ({ pageTitle }) => <div data-testid="listening-test-editor">{pageTitle}</div>,
}));

jest.mock('../../hooks', () => ({
  useListeningHandlers: jest.fn(),
  createNewPart: jest.fn(() => ({
    title: 'Part 1',
    instruction: '',
    transcript: '',
    audioFile: '',
    audioUrl: '',
    sections: [],
  })),
  calculateTotalQuestions: jest.fn(() => 0),
}));

jest.mock('../../utils/clozeTableSchema', () => ({
  normalizeListeningParts: jest.fn((parts) => parts),
  prepareListeningPartsForSubmit: jest.fn((parts) => parts),
}));

jest.mock('../../../../shared/utils/api', () => ({
  apiPath: jest.fn((path) => `/api/${path}`),
  authFetch: jest.fn(),
  redirectToLogin: jest.fn(),
}));

jest.mock('../../../../shared/utils/permissions', () => ({
  canManageCategory: jest.fn(() => true),
}));

const { useListeningHandlers } = require('../../hooks');
const { authFetch } = require('../../../../shared/utils/api');

const buildHandlers = () => ({
  parts: [],
  setParts: jest.fn(),
  selectedPartIndex: 0,
  setSelectedPartIndex: jest.fn(),
  selectedSectionIndex: 0,
  setSelectedSectionIndex: jest.fn(),
  message: '',
  setMessage: jest.fn(),
  handleAddPart: jest.fn(),
  handleDeletePart: jest.fn(),
  handlePartChange: jest.fn(),
  handleAddSection: jest.fn(),
  handleDeleteSection: jest.fn(),
  handleSectionChange: jest.fn(),
  handleCopySection: jest.fn(),
  handleAddQuestion: jest.fn(),
  handleDeleteQuestion: jest.fn(),
  handleQuestionChange: jest.fn(),
  handleCopyQuestion: jest.fn(),
  handleBulkAddQuestions: jest.fn(),
});

describe('EditListeningTest draft restore prompt', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();

    localStorage.setItem('user', JSON.stringify({ role: 'teacher', canManageTests: true }));

    useListeningHandlers.mockReturnValue(buildHandlers());
    authFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        title: 'Listening 6',
        classCode: 'L6',
        teacherName: 'Teacher',
        showResultModal: true,
        partInstructions: [],
        questions: [],
        partAudioUrls: {},
        mainAudioUrl: '',
      }),
    });
  });

  test('prompts only once for the same saved draft in StrictMode', async () => {
    localStorage.setItem(
      'listeningTestDraftEdit-6',
      JSON.stringify({
        title: 'Draft title',
        classCode: 'DRAFT',
        teacherName: 'Teacher',
        showResultModal: true,
        parts: [],
        savedAt: '2026-04-14T10:00:00.000Z',
      })
    );

    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);

    render(
      <React.StrictMode>
        <MemoryRouter initialEntries={['/listening/6/edit']}>
          <Routes>
            <Route path="/listening/:id/edit" element={<EditListeningTest />} />
          </Routes>
        </MemoryRouter>
      </React.StrictMode>
    );

    await waitFor(() => {
      expect(screen.getByTestId('listening-test-editor')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalledTimes(1);
    });
  });
});