import { aiService } from '../ai-service';
import { createComponentLogger } from '@/lib/observability/logger';

const log = createComponentLogger('ai/json-repair');

/**
 * Tenta fazer o parse de um JSON extraindo a partir de uma resposta bruta (markdown).
 * Em caso de falha de parsing semântico/sintático, pede para a IA consertar.
 * Resolve DEBT-AI-014.
 */
export async function parseRepairedJson<T>(
  rawResponse: string,
  expectedSchemaOrContext: string,
  maxRetries = 2
): Promise<T> {
  let currentAttempt = rawResponse;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Tentar extrair o bloco JSON
      const match = currentAttempt.match(/\{[\s\S]*\}/);
      const jsonString = match ? match[0] : currentAttempt;
      return JSON.parse(jsonString) as T;
    } catch (error) {
      log.warn(`[JSON Repair] Fallha no parse (tentativa ${attempt + 1}/${maxRetries + 1}). Error: ${error instanceof Error ? error.message : String(error)}`);
      
      if (attempt === maxRetries) {
        throw new Error(`Falha ao fazer parse do JSON após ${maxRetries} retentativas.`);
      }

      log.info(`[JSON Repair] Solicitando reparo semântico para a IA...`);
      // Pedir para a IA consertar
      const repairResponse = await aiService.query(
        `O JSON abaixo é inválido ou falhou no parsing.\nContexto esperado: ${expectedSchemaOrContext}\n\nJSON:\n${currentAttempt}`,
        undefined,
        {
          systemPrompt: 'Você é um especialista em formatação JSON. Sua única função é receber um JSON quebrado e devolvê-lo consertado e perfeitamente válido, apenas o JSON, sem markdown ou explicações.',
          model: 'gpt-4o-mini', // Modelo rápido e barato para reparo
          temperature: 0,
        }
      );
      currentAttempt = repairResponse.content;
    }
  }

  throw new Error('Unreachable');
}
