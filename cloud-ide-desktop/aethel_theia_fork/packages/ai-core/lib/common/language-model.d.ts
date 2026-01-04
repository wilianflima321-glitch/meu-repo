export interface LanguageModel {
  id: string;
  name: string;
  provider: string;
  status: { status: 'ready' | 'not-ready' | string; message?: string };
}

export interface LanguageModelRegistry {
  getAll(): LanguageModel[];
  getLanguageModels(): Promise<LanguageModel[]>;
  onChange(listener: () => void): any;
}

export interface FrontendLanguageModelRegistry {
  onChange(listener: () => void): any;
  getReadyLanguageModel(id: string): Promise<LanguageModel>;
  getLanguageModels(): Promise<LanguageModel[]>;
}

export interface FrontendLanguageModelRegistry extends LanguageModelRegistry {
  getReadyLanguageModel(id: string): Promise<LanguageModel>;
}

export const FrontendLanguageModelRegistry: unique symbol;
export const LanguageModelRegistry: unique symbol;
