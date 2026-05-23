import { render, screen } from '@testing-library/react';
import App from './App.jsx';

test('renders the login page for unauthenticated users', async () => {
  window.history.pushState({}, '', '/login');
  render(<App />);
  expect(await screen.findByRole('button', { name: 'Placement Test' })).toBeInTheDocument();
  const loginButtons = await screen.findAllByRole('button', { name: 'Login' });
  expect(loginButtons).toHaveLength(2);
});
