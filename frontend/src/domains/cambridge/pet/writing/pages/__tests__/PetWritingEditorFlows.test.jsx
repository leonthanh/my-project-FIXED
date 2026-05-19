import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import CreatePetWritingTestPage from '../CreatePetWritingTestPage';
import EditPetWritingTestPage from '../EditPetWritingTestPage';
import { normalizePetPart1NoteAnchors } from '../petWritingTemplateUtils';

jest.mock('react-quill', () => () => null);

jest.mock('../../../../../../shared/hooks/useQuillImageUpload', () => () => ({
  quillRef: { current: null },
  modules: {},
}));

jest.mock('../PetWritingEditorShell.jsx', () => ({ loading, onSubmit, message }) => {
  if (loading) {
    return <div>Loading PET writing editor...</div>;
  }

  return (
    <form onSubmit={onSubmit}>
      {message ? <div>{message}</div> : null}
      <button type="submit">Save PET Writing</button>
    </form>
  );
});

jest.mock('../../../../../../shared/components/InlineIcon.jsx', () => () => <span aria-hidden="true">icon</span>);

jest.mock('../../../../../../shared/utils/api', () => ({
  apiPath: jest.fn((path) => path),
  authFetch: jest.fn(),
  hostPath: jest.fn((path) => path),
  redirectToLogin: jest.fn(),
}));

const { authFetch } = require('../../../../../../shared/utils/api');

const originalFetch = global.fetch;

const LocationProbe = () => {
  const location = useLocation();
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>;
};

const renderAtRoute = ({ entry, path, element }) => render(
  <MemoryRouter initialEntries={[entry]}>
    <Routes>
      <Route path={path} element={element} />
    </Routes>
    <LocationProbe />
  </MemoryRouter>
);

describe('PET writing editor flows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  test('allows PET note anchors to clamp close to both email edges', () => {
    const normalized = normalizePetPart1NoteAnchors({
      note1: { x: -10, y: 45 },
      note2: { x: 120, y: 31 },
      note3: { x: -10, y: 53 },
      note4: { x: 120, y: 74 },
    });

    expect(normalized.note1.x).toBeGreaterThan(14);
    expect(normalized.note1.x).toBeLessThan(16);
    expect(normalized.note2.x).toBeGreaterThan(82);
    expect(normalized.note2.x).toBeLessThan(84);
  });

  test('redirects create save success back to the PET test list', async () => {
    jest.useFakeTimers();
    authFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ message: 'Saved' }),
    });

    renderAtRoute({
      entry: '/admin/create-pet-writing',
      path: '/admin/create-pet-writing',
      element: <CreatePetWritingTestPage />,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save PET Writing' }));

    await waitFor(() => {
      expect(authFetch).toHaveBeenCalledWith('writing-tests', expect.objectContaining({ method: 'POST' }));
    });

    await act(async () => {
      jest.advanceTimersByTime(1200);
    });

    expect(screen.getByTestId('location')).toHaveTextContent('/select-test?platform=orange&type=pet&tab=writing');
  });

  test('redirects edit save success back to the PET test list', async () => {
    jest.useFakeTimers();
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        task1: '',
        part2Question2: '',
        part2Question3: '',
        classCode: 'PET-A',
        teacherName: 'Teacher',
        task1Image: '',
      }),
    });
    authFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        message: 'Updated',
        test: { task1Image: '' },
      }),
    });

    renderAtRoute({
      entry: '/admin/edit-pet-writing/29',
      path: '/admin/edit-pet-writing/:id',
      element: <EditPetWritingTestPage />,
    });

    expect(await screen.findByRole('button', { name: 'Save PET Writing' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Save PET Writing' }));

    await waitFor(() => {
      expect(authFetch).toHaveBeenCalledWith('writing-tests/29', expect.objectContaining({ method: 'PUT' }));
    });

    await act(async () => {
      jest.advanceTimersByTime(1200);
    });

    expect(screen.getByTestId('location')).toHaveTextContent('/select-test?platform=orange&type=pet&tab=writing');
  });
});