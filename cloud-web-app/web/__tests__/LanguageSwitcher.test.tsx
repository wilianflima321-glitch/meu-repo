import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import LanguageSwitcher from '../components/LanguageSwitcher';

test('renders language switcher', () => {
  render(<LanguageSwitcher />);
  const button = screen.getByRole('button');
  expect(button).toBeTruthy();
});

test('changes language on click', () => {
  render(<LanguageSwitcher />);
  const button = screen.getByRole('button');
  fireEvent.click(button);
  // Verificar se mudou idioma
});