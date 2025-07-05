import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

test('renders App component', () => {
  render(
    <MemoryRouter initialEntries={['/login']}>
      <App />
    </MemoryRouter>
  );
  // Just test that the App renders without crashing
  expect(document.querySelector('.App')).toBeInTheDocument();
});
