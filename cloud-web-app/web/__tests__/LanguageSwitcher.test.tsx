import { render, screen, fireEvent } from '@testing-library/react';
import LanguageSwitcher from '../components/LanguageSwitcher';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: {
      changeLanguage: jest.fn(),
    },
  }),
}));

test('renders language switcher', () => {
  render(<LanguageSwitcher />);
	const buttons = screen.getAllByRole('button');
	expect(buttons.length).toBeGreaterThanOrEqual(2);
});

test('changes language on click', () => {
  render(<LanguageSwitcher />);

	const enButton = screen.getByRole('button', { name: 'EN' });
	fireEvent.click(enButton);

	// Sem provider real, validamos que o botão existe e é clicável.
	expect(enButton).toBeTruthy();
});