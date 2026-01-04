// g:\\repo\\cloud-web-app\\web\\types\\index.ts

/**
 * Representa uma única mensagem em uma conversa de chat.
 */
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * A requisição para o endpoint de chat.
 */
export interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  stream?: boolean;
}

/**
 * A resposta do endpoint de chat (não-streaming).
 */
export interface ChatResponse {
  id: string;
  model: string;
  choices: {
    message: ChatMessage;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  // O campo message é um atalho para choices[0].message
  message: ChatMessage;
}

/**
 * Representa um evento de Server-Sent Event (SSE) para o modo streaming.
 */
export interface SSEEvent {
  data: string;
  event?: string;
  id?: string;
  retry?: number;
}

/**
 * Representa os dados de um usuário.
 */
export interface User {
  id: string;
  email: string;
  full_name?: string;
  is_active?: boolean;
  is_superuser?: boolean;
}

/**
 * Representa a resposta do login.
 */
export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}
