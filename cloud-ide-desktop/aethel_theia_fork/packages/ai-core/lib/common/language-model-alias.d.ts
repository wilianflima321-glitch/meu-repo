export interface LanguageModelAlias {
  id: string;
  defaultModelIds: string[];
  selectedModelId?: string;
  description?: string;
}

export interface LanguageModelAliasRegistry {
  getAliases(): LanguageModelAlias[];
  ready: Promise<void>;
  onDidChange(listener: () => void): any;
  addAlias(alias: LanguageModelAlias): void;
}

export const LanguageModelAliasRegistry: unique symbol;
