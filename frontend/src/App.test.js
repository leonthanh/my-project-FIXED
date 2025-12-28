import { render, screen } from '@testing-library/react';
import App from './App';

test('renders login buttons', () => {
  render(<App />);
  const loginButton = screen.getByText(/Đăng nhập/i);
  expect(loginButton).toBeInTheDocument();
});
