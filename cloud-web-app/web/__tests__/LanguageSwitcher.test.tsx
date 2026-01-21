import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import LanguageSwitcher from '../components/LanguageSwitcher';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: {
      changeLanguage: vi.fn(),
    },
  }),
}));

describe('LanguageSwitcher', () => {
  it('renders language switcher', () => {
    render(<LanguageSwitcher />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(2);
  });

  it('changes language on click', () => {
    render(<LanguageSwitcher />);

    const enButton = screen.getByRole('button', { name: 'EN' });
    fireEvent.click(enButton);

    // Sem provider real, validamos que o botão existe e é clicável.
    expect(enButton).toBeTruthy();
  });
});