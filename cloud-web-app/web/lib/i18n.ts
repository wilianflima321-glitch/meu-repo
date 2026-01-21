import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { translations, supportedLanguages } from './translations';

/**
 * AETHEL ENGINE - i18n Configuration
 * 
 * NOW CONNECTED to translations.ts (1699 lines of real translations)
 * Supports: en-US, pt-BR, es-ES
 * 
 * @see translations.ts for all translation strings
 */

const resources = {
  'en': { translation: translations['en-US'] },
  'en-US': { translation: translations['en-US'] },
  'pt-BR': { translation: translations['pt-BR'] },
  'pt': { translation: translations['pt-BR'] },
  'es': { translation: translations['es-ES'] },
  'es-ES': { translation: translations['es-ES'] },
} as const;

// Initialize i18next with real translations
if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources,
    lng: 'en-US',
    fallbackLng: 'en-US',
    interpolation: { escapeValue: false },
    supportedLngs: supportedLanguages.map(l => l.code),
    ns: ['translation'],
    defaultNS: 'translation',
    // Enable nested keys (e.g., 'common.save')
    keySeparator: '.',
    // Debug mode in development
    debug: process.env.NODE_ENV === 'development',
  });
}

export { supportedLanguages };
export default i18n;
