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

    render(
      <MemoryRouter initialEntries={["/listening/5"]}>
        <Routes>
          <Route path="/listening/:id" element={<DoListeningTest />} />
        </Routes>
      </MemoryRouter>
    );

    // Modal should be visible with title
    const modalTitle = await screen.findByText(/Bắt đầu bài thi/);
    expect(modalTitle).toBeInTheDocument();

    // Audio element should not be present yet
    expect(document.querySelector('audio')).toBeNull();

    // The timer should not have started yet (no expires key)
    expect(localStorage.getItem('listening:5:expiresAt')).toBeNull();

    // Click the Play button in the modal
    const playBtn = screen.getByText(/Bắt đầu & Phát audio/);
    await act(async () => {
      fireEvent.click(playBtn);
    });

    // Modal should be gone
    await waitFor(() => expect(screen.queryByText(/Bắt đầu bài thi/)).toBeNull());

    // After starting, the expires key should be present
    await waitFor(() => expect(localStorage.getItem('listening:5:expiresAt')).not.toBeNull());

    // Now simulate a user who chose 'Bắt đầu không phát' and then reloads.
    // We'll remount with started=true persisted in localStorage and ensure the 'Phát lại audio' button is visible
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
    await waitFor(() => expect(screen.queryByText(/Bắt đầu bài thi/)).toBeNull());
    const resumeBtn = await screen.findByText(/Phát lại audio/);
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

    // play() should have been invoked
    expect(playSpy).toHaveBeenCalled();

    // Simulate audio ended and assert warning + one-play enforcement
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

    // Fire ended event
    act(() => {
      fireEvent(audioEl, new Event('ended'));
    });

    // The warning should be visible
    expect(screen.getByText(/Audio chỉ được nghe 1 lần/)).toBeInTheDocument();

    // Try to play again (user attempt) -> should trigger alert
    act(() => {
      fireEvent(audioEl, new Event('play'));
    });
    expect(alertSpy).toHaveBeenCalled();
    alertSpy.mockRestore();

    playSpy.mockRestore();
  });
});
