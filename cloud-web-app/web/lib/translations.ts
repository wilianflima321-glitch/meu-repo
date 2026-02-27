/**
 * AETHEL ENGINE - i18n Translations
 *
 * Complete translation files for all supported languages.
 * Covers entire IDE interface, marketplace, and engine features.
 */

import type { TranslationStrings } from './translations-types';
import {
  en_US,
  es_ES,
  pt_BR,
  supportedLanguages,
  translations,
} from './translations-locales';

export type { TranslationStrings } from './translations-types';
export { en_US, es_ES, pt_BR, supportedLanguages, translations } from './translations-locales';

export function getTranslation(locale: string): TranslationStrings {
    return translations[locale] || translations['en-US'];
}

export default translations;
