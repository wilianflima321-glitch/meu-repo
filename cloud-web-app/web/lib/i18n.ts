import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: { translation: {} },
  'pt-BR': { translation: {} },
  es: { translation: {} },
  fr: { translation: {} },
  zh: { translation: {} },
  ja: { translation: {} },
} as const;

// Keep init lightweight: no backend loading, no extra runtime requirements.
if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    supportedLngs: Object.keys(resources),
  });
}

export default i18n;
