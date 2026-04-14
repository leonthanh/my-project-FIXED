import { render, screen } from '@testing-library/react';
import App from './App.jsx';

test('renders login buttons', () => {
  render(<App />);
  const loginButtons = screen.getAllByRole('button', { name: /Login/i });
  expect(loginButtons).toHaveLength(2);
});
