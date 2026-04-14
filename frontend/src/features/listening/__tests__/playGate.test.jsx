import React from 'react';
import { act, render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import DoListeningTest from '../pages/DoListeningTest';

const sampleTestWithAudio = {
  id: 5,
  title: 'Sample Listening',
  partInstructions: [{ title: 'Part 1', sections: [{ sectionTitle: 'Q1-10', questionType: 'notes-completion' }] }],
  questions: [{ partIndex: 0, sectionIndex: 0, questionIndex: 0, questionType: 'notes-completion', notesText: '1___ 2___', answers: { 1: 'a' } }],
  partAudioUrls: ['test-audio.mp3'],
};

describe('Listening start gate (play modal)', () => {
  beforeEach(() => {
    jest.spyOn(window, 'fetch').mockImplementation((url) => {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(sampleTestWithAudio) });
    });
    window.HTMLElement.prototype.scrollIntoView = jest.fn();
    localStorage.clear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    cleanup();
    localStorage.clear();
  });

  test('shows start modal and plays audio on user confirmation', async () => {
    // Spy on play()
    const playSpy = jest.spyOn(window.HTMLMediaElement.prototype, 'play').mockImplementation(() => Promise.resolve());
    const pauseSpy = jest.spyOn(window.HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);

    render(
      <MemoryRouter initialEntries={["/listening/5"]}>
        <Routes>
          <Route path="/listening/:id" element={<DoListeningTest />} />
        </Routes>
      </MemoryRouter>
    );

    // Modal should be visible with the current test title and CTA
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Sample Listening')).toBeInTheDocument();
    expect(screen.getByText('Play & Start')).toBeInTheDocument();

    // Audio element should not be present yet
    expect(document.querySelector('audio')).toBeNull();

    // The timer should not have started yet (no expires key)
    expect(localStorage.getItem('listening:5:expiresAt:anon')).toBeNull();

    // Click the Play button in the modal
    const playBtn = screen.getByText('Play & Start');
    await act(async () => {
      fireEvent.click(playBtn);
    });

    // Modal should be gone
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    // After starting, the expires key should be present
    await waitFor(() => expect(localStorage.getItem('listening:5:expiresAt:anon')).not.toBeNull());

    // Now simulate a user who reloaded after the attempt had already started.
    // We'll remount with started=true persisted in localStorage and ensure the audio resume button is visible.
    // First, simulate starting without autoplay
    // remount: clear DOM and set persisted state
    cleanup();
    const saved = { started: true, audioPlayed: {} };
    localStorage.setItem('listening:5:state:anon', JSON.stringify(saved));
    render(
      <MemoryRouter initialEntries={["/listening/5"]}>
        <Routes>
          <Route path="/listening/:id" element={<DoListeningTest />} />
        </Routes>
      </MemoryRouter>
    );

    // The modal should not appear and the resume button should be visible
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    const resumeBtn = await screen.findByText('Play audio');
    expect(resumeBtn).toBeInTheDocument();

    // Clicking resume should call play()
    const playSpy2 = jest.spyOn(window.HTMLMediaElement.prototype, 'play').mockImplementation(() => Promise.resolve());
    await act(async () => {
      fireEvent.click(resumeBtn);
    });

    expect(playSpy2).toHaveBeenCalled();
    playSpy2.mockRestore();

    // Audio element should now exist
    const audioEl = await waitFor(() => document.querySelector('audio'));
    expect(audioEl).not.toBeNull();

    // Audio must NOT expose native controls
    expect(audioEl.hasAttribute('controls')).toBe(false);

    // Simulate audio ended and assert warning + one-play enforcement
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

    // Fire ended event
    act(() => {
      fireEvent(audioEl, new Event('ended'));
    });

    // The warning should be visible
    expect(screen.getByText('Audio can only be played once.')).toBeInTheDocument();

    // Try to play again (user attempt) -> should trigger alert
    act(() => {
      fireEvent(audioEl, new Event('play'));
    });
    expect(alertSpy).toHaveBeenCalled();
    alertSpy.mockRestore();

    playSpy.mockRestore();
    pauseSpy.mockRestore();
  });

  test('drops stale finished submission state instead of auto-submitting on load', async () => {
    const fetchCalls = [];

    localStorage.setItem(
      'listening:5:state:anon',
      JSON.stringify({
        started: true,
        submissionId: 321,
        expiresAt: Date.now() - 60_000,
        answers: {},
      })
    );
    localStorage.setItem('listening:5:expiresAt:anon', String(Date.now() - 60_000));

    jest.spyOn(window, 'fetch').mockImplementation((url) => {
      const normalizedUrl = String(url);
      fetchCalls.push(normalizedUrl);

      if (normalizedUrl.includes('/listening-tests/5')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(sampleTestWithAudio) });
      }

      if (normalizedUrl.includes('/listening-submissions/5/active?submissionId=321')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              submission: {
                id: 321,
                testId: 5,
                finished: true,
                answers: {},
                expiresAt: Date.now() - 60_000,
              },
            }),
        });
      }

      if (normalizedUrl.includes('/submit')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ submissionId: 999, correct: 0, total: 40, scorePercentage: 0, band: 3.5 }),
        });
      }

      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(
      <MemoryRouter initialEntries={["/listening/5"]}>
        <Routes>
          <Route path="/listening/:id" element={<DoListeningTest />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText('Play & Start')).toBeInTheDocument();
    expect(screen.queryByText('Listening Results')).toBeNull();
    expect(fetchCalls.some((url) => url.includes('/submit'))).toBe(false);
    expect(localStorage.getItem('listening:5:state:anon')).toBeNull();
    expect(localStorage.getItem('listening:5:expiresAt:anon')).toBeNull();
  });

  test('does not bind a fresh start to an expired empty active attempt from the same user', async () => {
    const fetchCalls = [];
    localStorage.setItem('user', JSON.stringify({ id: 77, name: 'Thanh' }));
    const playSpy = jest.spyOn(window.HTMLMediaElement.prototype, 'play').mockImplementation(() => Promise.resolve());
    const pauseSpy = jest.spyOn(window.HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);

    jest.spyOn(window, 'fetch').mockImplementation((url) => {
      const normalizedUrl = String(url);
      fetchCalls.push(normalizedUrl);

      if (normalizedUrl.includes('/listening-tests/5')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(sampleTestWithAudio) });
      }

      if (normalizedUrl.includes('/listening-submissions/5/active?userId=77')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            submission: {
              id: 555,
              testId: 5,
              userId: 77,
              finished: false,
              answers: {},
              expiresAt: Date.now() - 60_000,
            },
          }),
        });
      }

      if (normalizedUrl.includes('/submit')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ submissionId: 1234, correct: 0, total: 40, scorePercentage: 0, band: 3.5 }),
        });
      }

      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(
      <MemoryRouter initialEntries={["/listening/5"]}>
        <Routes>
          <Route path="/listening/:id" element={<DoListeningTest />} />
        </Routes>
      </MemoryRouter>
    );

    const startBtn = await screen.findByText('Play & Start');
    await act(async () => {
      fireEvent.click(startBtn);
    });

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.queryByText('Listening Results')).toBeNull();
    expect(fetchCalls.some((url) => url.includes('/submit'))).toBe(false);

    const expiresAt = Number(localStorage.getItem('listening:5:expiresAt:77'));
    expect(Number.isFinite(expiresAt)).toBe(true);
    expect(expiresAt).toBeGreaterThan(Date.now());

    playSpy.mockRestore();
    pauseSpy.mockRestore();
  });

  test('ignores a stale local expires key when starting a fresh attempt', async () => {
    const playSpy = jest.spyOn(window.HTMLMediaElement.prototype, 'play').mockImplementation(() => Promise.resolve());
    const pauseSpy = jest.spyOn(window.HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);

    localStorage.setItem('listening:5:expiresAt:anon', String(Date.now() - 60_000));

    jest.spyOn(window, 'fetch').mockImplementation((url) => {
      const normalizedUrl = String(url);

      if (normalizedUrl.includes('/listening-tests/5')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(sampleTestWithAudio) });
      }

      return Promise.resolve({ ok: true, json: () => Promise.resolve({ submission: null }) });
    });

    render(
      <MemoryRouter initialEntries={["/listening/5"]}>
        <Routes>
          <Route path="/listening/:id" element={<DoListeningTest />} />
        </Routes>
      </MemoryRouter>
    );

    const startBtn = await screen.findByText('Play & Start');
    await act(async () => {
      fireEvent.click(startBtn);
    });

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.queryByText('Listening Results')).toBeNull();

    const expiresAt = Number(localStorage.getItem('listening:5:expiresAt:anon'));
    expect(Number.isFinite(expiresAt)).toBe(true);
    expect(expiresAt).toBeGreaterThan(Date.now());

    playSpy.mockRestore();
    pauseSpy.mockRestore();
  });

  test('does not auto-submit when reload only has local started state and the server attempt is empty', async () => {
    const fetchCalls = [];
    const futureExpiresAt = Date.now() + 20 * 60 * 1000;

    localStorage.setItem('user', JSON.stringify({ id: 77, name: 'Thanh' }));
    localStorage.setItem(
      'listening:5:state:77',
      JSON.stringify({
        started: true,
        answers: {},
        audioPlayed: {},
        expiresAt: futureExpiresAt,
      })
    );
    localStorage.setItem('listening:5:expiresAt:77', String(futureExpiresAt));

    window.fetch.mockImplementation((url) => {
      const normalizedUrl = String(url);
      fetchCalls.push(normalizedUrl);

      if (normalizedUrl.includes('/listening-tests/5')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(sampleTestWithAudio) });
      }

      if (normalizedUrl.includes('/listening-submissions/5/active?userId=77')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            submission: {
              id: 777,
              testId: 5,
              userId: 77,
              finished: false,
              answers: {},
              expiresAt: Date.now() - 60_000,
            },
          }),
        });
      }

      if (normalizedUrl.includes('/submit')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ submissionId: 4444, correct: 0, total: 40, scorePercentage: 0, band: 3.5 }),
        });
      }

      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(
      <MemoryRouter initialEntries={["/listening/5"]}>
        <Routes>
          <Route path="/listening/:id" element={<DoListeningTest />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(await screen.findByText('Play audio')).toBeInTheDocument();
    expect(screen.queryByText('Listening Results')).toBeNull();
    expect(fetchCalls.some((url) => url.includes('/submit'))).toBe(false);
    expect(Number(localStorage.getItem('listening:5:expiresAt:77'))).toBeGreaterThan(Date.now());
  });

  test('does not send an empty autosave beacon when refreshing after start without answers', async () => {
    const playSpy = jest.spyOn(window.HTMLMediaElement.prototype, 'play').mockImplementation(() => Promise.resolve());
    const pauseSpy = jest.spyOn(window.HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
    const originalSendBeacon = window.navigator.sendBeacon;
    const sendBeaconMock = jest.fn();
    Object.defineProperty(window.navigator, 'sendBeacon', {
      configurable: true,
      value: sendBeaconMock,
    });

    window.fetch.mockImplementation((url) => {
      const normalizedUrl = String(url);

      if (normalizedUrl.includes('/listening-tests/5')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(sampleTestWithAudio) });
      }

      return Promise.resolve({ ok: true, json: () => Promise.resolve({ submission: null }) });
    });

    render(
      <MemoryRouter initialEntries={["/listening/5"]}>
        <Routes>
          <Route path="/listening/:id" element={<DoListeningTest />} />
        </Routes>
      </MemoryRouter>
    );

    const startBtn = await screen.findByText('Play & Start');
    await act(async () => {
      fireEvent.click(startBtn);
    });

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    act(() => {
      window.dispatchEvent(new Event('beforeunload'));
    });

    expect(sendBeaconMock).not.toHaveBeenCalled();

    if (originalSendBeacon) {
      Object.defineProperty(window.navigator, 'sendBeacon', {
        configurable: true,
        value: originalSendBeacon,
      });
    } else {
      delete window.navigator.sendBeacon;
    }

    playSpy.mockRestore();
    pauseSpy.mockRestore();
  });

  test('treats empty-string table-style answers as unanswered and does not resume expired user attempt', async () => {
    const fetchCalls = [];
    const playSpy = jest.spyOn(window.HTMLMediaElement.prototype, 'play').mockImplementation(() => Promise.resolve());
    const pauseSpy = jest.spyOn(window.HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);

    localStorage.setItem('user', JSON.stringify({ id: 77, name: 'Thanh' }));
    localStorage.setItem(
      'listening:5:state:77',
      JSON.stringify({
        started: false,
        answers: { 1: '', 2: '', 3: '' },
      })
    );

    jest.spyOn(window, 'fetch').mockImplementation((url) => {
      const normalizedUrl = String(url);
      fetchCalls.push(normalizedUrl);

      if (normalizedUrl.includes('/listening-tests/5')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(sampleTestWithAudio) });
      }

      if (normalizedUrl.includes('/listening-submissions/5/active?userId=77')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            submission: {
              id: 901,
              testId: 5,
              userId: 77,
              finished: false,
              answers: {},
              expiresAt: Date.now() - 60_000,
            },
          }),
        });
      }

      if (normalizedUrl.includes('/submit')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ submissionId: 5000, correct: 0, total: 40, scorePercentage: 0, band: 3.5 }),
        });
      }

      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(
      <MemoryRouter initialEntries={["/listening/5"]}>
        <Routes>
          <Route path="/listening/:id" element={<DoListeningTest />} />
        </Routes>
      </MemoryRouter>
    );

    const startBtn = await screen.findByText('Play & Start');
    await act(async () => {
      fireEvent.click(startBtn);
    });

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.queryByText('Listening Results')).toBeNull();
    expect(fetchCalls.some((url) => url.includes('/submit'))).toBe(false);

    const expiresAt = Number(localStorage.getItem('listening:5:expiresAt:77'));
    expect(Number.isFinite(expiresAt)).toBe(true);
    expect(expiresAt).toBeGreaterThan(Date.now());

    playSpy.mockRestore();
    pauseSpy.mockRestore();
  });
});

