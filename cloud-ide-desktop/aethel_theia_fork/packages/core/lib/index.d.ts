export * from './common/index';

export interface CommandContribution {}
export interface PreferenceContribution {}
export interface ConnectionHandler {}

export interface PreferenceService {
  onPreferenceChanged(listener: (e: { preferenceName?: string }) => void): any;
  get<T = any>(preferenceName: string, defaultValue?: T): T;
  set(preferenceName: string, value: any, scope?: any): Promise<void>;
  updateValue(preferenceName: string, value: any): Promise<void>;
}

export interface MessageService {
  info(message: string, title?: string): void;
  warn(message: string, title?: string): void;
  error(message: string, title?: string): void;
}

export interface Command {
  id: string;
  label?: string;
}

export interface CommandRegistry {
  getAllCommands(): Command[];
  getCommand(id: string): Command | undefined;
}

export const CommandContribution: unique symbol;
export const PreferenceContribution: unique symbol;
export const ConnectionHandler: unique symbol;
export const PreferenceService: unique symbol;
export const MessageService: unique symbol;
export const CommandRegistry: unique symbol;

export class RpcConnectionHandler<T> {
  constructor(path: string, factory: (client: T) => any);
}

