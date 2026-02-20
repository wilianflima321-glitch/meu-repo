/**
 * AETHEL ENGINE - i18n Locale Aggregator
 */

import type { TranslationStrings } from './translations-types';
import { en_US } from './translations-locale-en';
import { es_ES } from './translations-locale-es';
import { pt_BR } from './translations-locale-pt';

export { en_US } from './translations-locale-en';
export { pt_BR } from './translations-locale-pt';
export { es_ES } from './translations-locale-es';

export const translations: Record<string, TranslationStrings> = {
    'en-US': en_US,
    'en': en_US,
    'pt-BR': pt_BR,
    'pt': pt_BR,
    'es-ES': es_ES,
    'es': es_ES
};

export const supportedLanguages = [
    { code: 'en-US', name: 'English (US)', nativeName: 'English' },
    { code: 'pt-BR', name: 'Portuguese (Brazil)', nativeName: 'Portugues (Brasil)' },
    { code: 'es-ES', name: 'Spanish (Spain)', nativeName: 'Espanol (Espana)' }
];
