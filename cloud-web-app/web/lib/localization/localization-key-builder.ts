import type { TranslationNamespace, TranslationPluralForm } from './localization-system.types';

export class TranslationKeyBuilder {
  private translations: TranslationNamespace = {};

  add(key: string, value: string | TranslationPluralForm, options?: { context?: string; description?: string }): this {
    const parts = key.split('.');
    let current = this.translations;

    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) {
        current[parts[i]] = {};
      }
      current = current[parts[i]] as TranslationNamespace;
    }

    const lastKey = parts[parts.length - 1];

    if (options?.context || options?.description) {
      current[lastKey] = {
        value,
        context: options.context,
        description: options.description,
      };
    } else {
      current[lastKey] = value as string;
    }

    return this;
  }

  addPlural(key: string, forms: TranslationPluralForm): this {
    return this.add(key, forms);
  }

  build(): TranslationNamespace {
    return this.translations;
  }

  toJSON(): string {
    return JSON.stringify(this.translations, null, 2);
  }
}
