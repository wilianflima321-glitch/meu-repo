import { NextRequest, NextResponse } from 'next/server';
import { aiService } from '@/lib/ai-service';

/**
 * API Route: Inline Edit
 * 
 * Endpoint para edição de código inline estilo Cursor AI.
 * Recebe código + instrução e retorna código modificado.
 */

const INLINE_EDIT_SYSTEM_PROMPT = `Você é um assistente de programação especializado em edição de código inline.

REGRAS CRÍTICAS:
1. SEMPRE retorne APENAS o código modificado, sem explicações no código
2. Mantenha o estilo e formatação do código original
3. Preserve imports e dependências existentes
4. Se não puder fazer a modificação, retorne o código original
5. Nunca adicione markdown code blocks na resposta

Seu trabalho é:
- Receber código existente e uma instrução
- Aplicar a modificação solicitada
- Retornar o código modificado

Responda SEMPRE no formato JSON:
{
  "code": "// código modificado aqui",
  "explanation": "Breve explicação do que foi alterado",
  "confidence": 0.95
}`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, instruction, language, filePath, context } = body;

    if (!instruction?.trim()) {
      return NextResponse.json(
        { error: 'Instrução é obrigatória' },
        { status: 400 }
      );
    }

    const userPrompt = buildPrompt(code, instruction, language, filePath, context);

    const result = await aiService.chat({
      messages: [
        { role: 'system', content: INLINE_EDIT_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3, // Baixa para código mais consistente
      maxTokens: 4096,
    });

    // Parse JSON response
    let parsedResult;
    try {
      // Try to extract JSON from response
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResult = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback: treat entire response as code
        parsedResult = {
          code: result.content,
          explanation: 'Código modificado conforme solicitado',
          confidence: 0.8,
        };
      }
    } catch (e) {
      // JSON parse failed, use raw response as code
      parsedResult = {
        code: result.content.replace(/```[\w]*\n?/g, '').replace(/```$/g, ''),
        explanation: 'Código modificado',
        confidence: 0.7,
      };
    }

    return NextResponse.json(parsedResult);
  } catch (error) {
    console.error('Inline Edit Error:', error);
    return NextResponse.json(
      { error: 'Erro ao processar edição' },
      { status: 500 }
    );
  }
}

function buildPrompt(
  code: string,
  instruction: string,
  language?: string,
  filePath?: string,
  context?: { cursorPosition?: { line: number; column: number } }
): string {
  let prompt = `INSTRUÇÃO: ${instruction}\n\n`;

  if (language) {
    prompt += `LINGUAGEM: ${language}\n`;
  }

  if (filePath) {
    prompt += `ARQUIVO: ${filePath}\n`;
  }

  if (context?.cursorPosition) {
    prompt += `POSIÇÃO DO CURSOR: Linha ${context.cursorPosition.line}, Coluna ${context.cursorPosition.column}\n`;
  }

  if (code?.trim()) {
    prompt += `\nCÓDIGO ORIGINAL:\n\`\`\`${language || ''}\n${code}\n\`\`\``;
  } else {
    prompt += `\n(Nenhum código selecionado - gerar código novo)`;
  }

  prompt += `\n\nAplique a instrução ao código e retorne o resultado em JSON.`;

  return prompt;
}
