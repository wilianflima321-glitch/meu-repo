import { useCallback, useRef, useState } from 'react'
import type { AIRequest, AIResponse } from './useTheiaSystemsHooks'

// ==================== useAI Hook ====================

export interface UseAIReturn {
    isLoading: boolean;
    error: string | null;
    chat: (request: AIRequest) => Promise<AIResponse>;
    stream: (request: AIRequest, onChunk: (chunk: string) => void) => Promise<AIResponse>;
    generateCode: (prompt: string, language: string) => Promise<string>;
    explainCode: (code: string, language: string) => Promise<string>;
    reviewCode: (code: string, language: string) => Promise<string>;
    translateCode: (code: string, fromLang: string, toLang: string) => Promise<string>;
    cancel: () => void;
}

export function useAI(): UseAIReturn {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const abortController = useRef<AbortController | null>(null);

    const chat = useCallback(async (request: AIRequest): Promise<AIResponse> => {
        abortController.current?.abort();
        abortController.current = new AbortController();

        setIsLoading(true);
        setError(null);

        try {
            const response = await callAIBackend(request, abortController.current.signal);
            return response;
        } catch (err) {
            if ((err as Error).name !== 'AbortError') {
                setError((err as Error).message);
            }
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const stream = useCallback(async (request: AIRequest, onChunk: (chunk: string) => void): Promise<AIResponse> => {
        abortController.current?.abort();
        abortController.current = new AbortController();

        setIsLoading(true);
        setError(null);

        try {
            const response = await streamAIBackend({ ...request, stream: true }, onChunk, abortController.current.signal);
            return response;
        } catch (err) {
            if ((err as Error).name !== 'AbortError') {
                setError((err as Error).message);
            }
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const generateCode = useCallback(async (prompt: string, language: string): Promise<string> => {
        const response = await chat({
            prompt: `Generate ${language} code for: ${prompt}. Return only the code, no explanations.`,
            agentType: 'coder',
        });
        return response.content;
    }, [chat]);

    const explainCode = useCallback(async (code: string, language: string): Promise<string> => {
        const response = await chat({
            prompt: `Explain this ${language} code:\n\n\`\`\`${language}\n${code}\n\`\`\``,
            agentType: 'documenter',
        });
        return response.content;
    }, [chat]);

    const reviewCode = useCallback(async (code: string, language: string): Promise<string> => {
        const response = await chat({
            prompt: `Review this ${language} code for bugs, security issues, and best practices:\n\n\`\`\`${language}\n${code}\n\`\`\``,
            agentType: 'reviewer',
        });
        return response.content;
    }, [chat]);

    const translateCode = useCallback(async (code: string, fromLang: string, toLang: string): Promise<string> => {
        const response = await chat({
            prompt: `Translate this ${fromLang} code to ${toLang}. Return only the code:\n\n\`\`\`${fromLang}\n${code}\n\`\`\``,
            agentType: 'coder',
        });
        return response.content;
    }, [chat]);

    const cancel = useCallback(() => {
        abortController.current?.abort();
        setIsLoading(false);
    }, []);

    return {
        isLoading,
        error,
        chat,
        stream,
        generateCode,
        explainCode,
        reviewCode,
        translateCode,
        cancel,
    };
}

async function callAIBackend(request: AIRequest, signal: AbortSignal): Promise<AIResponse> {
    try {
        const response = await fetch('/api/ai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(request),
            signal,
        });

        if (response.ok) {
            return response.json();
        }
    } catch {
        // Fallback
    }

    // Fallback: return placeholder
    return {
        content: 'AI backend not connected. Please ensure the Theia backend is running.',
    };
}

async function streamAIBackend(
    request: AIRequest,
    onChunk: (chunk: string) => void,
    signal: AbortSignal
): Promise<AIResponse> {
    try {
        const response = await fetch('/api/ai/stream', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(request),
            signal,
        });

        if (response.ok && response.body) {
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullContent = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value, { stream: true });
                fullContent += chunk;
                onChunk(chunk);
            }

            return { content: fullContent };
        }
    } catch {
        // Fallback
    }

    return { content: 'Streaming not available' };
}
